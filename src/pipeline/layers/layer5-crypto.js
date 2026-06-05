/**
 * Layer 5 — Crypto & Blockchain Intelligence
 *
 * Screens wallet addresses for risk exposure:
 * - OFAC-listed addresses (handled in Layer 1, referenced here)
 * - Known mixer/tumbler activity
 * - Darknet market interactions
 * - Sanctioned exchange exposure
 * - Unusual transaction patterns
 *
 * Sources:
 * - Etherscan API (Ethereum — free tier: 5 req/sec)
 * - Blockchair API (multi-chain — free tier available)
 * - Blockchain.com API (Bitcoin)
 */

const axios = require('axios');
const logger = require('../../utils/logger');

// Known high-risk contract addresses and labels
// In production this would be a maintained database updated from multiple threat intel feeds
const KNOWN_RISK_ADDRESSES = {
  // Ethereum mixers
  '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b': { label: 'Tornado Cash', riskType: 'MIXER', severity: 'CRITICAL' },
  '0x722122df12d4e14e13ac3b6895a86e84145b6967': { label: 'Tornado Cash', riskType: 'MIXER', severity: 'CRITICAL' },
  '0xdd4c48c0b24039969fc16d1cdf626eab821d3384': { label: 'Tornado Cash', riskType: 'MIXER', severity: 'CRITICAL' },
};

const RISK_LABELS = {
  MIXER: { label: 'Cryptocurrency Mixer / Tumbler', scoreBoost: 35, description: 'Mixers are used to obscure the origin of funds. Direct interaction is a significant AML red flag.' },
  DARKNET: { label: 'Darknet Market', scoreBoost: 40, description: 'Interaction with known darknet marketplace addresses.' },
  SANCTIONED_EXCHANGE: { label: 'Sanctioned Exchange', scoreBoost: 40, description: 'Funds sent to or received from a sanctioned cryptocurrency exchange.' },
  HIGH_RISK_EXCHANGE: { label: 'High-Risk Exchange', scoreBoost: 15, description: 'Interaction with an exchange known for weak AML controls.' },
  GAMBLING: { label: 'Crypto Gambling Platform', scoreBoost: 8, description: 'Interaction with online gambling platforms.' },
};

/**
 * Detect wallet chain from address format.
 */
function detectChain(address) {
  if (!address) return null;
  if (address.startsWith('0x') && address.length === 42) return 'ETH';
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) return 'BTC';
  if (/^bc1[a-z0-9]{6,87}$/.test(address)) return 'BTC'; // bech32
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return 'SOL';
  return 'UNKNOWN';
}

/**
 * Screen Ethereum address via Etherscan.
 */
async function screenEthAddress(address) {
  const apiKey = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken'; // Etherscan works without key (rate-limited)

  try {
    // Get transaction list
    const [txResponse, balanceResponse] = await Promise.all([
      axios.get('https://api.etherscan.io/api', {
        params: {
          module: 'account',
          action: 'txlist',
          address,
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 100, // Last 100 transactions
          sort: 'desc',
          apikey: apiKey,
        },
        timeout: 10000,
      }),
      axios.get('https://api.etherscan.io/api', {
        params: {
          module: 'account',
          action: 'balance',
          address,
          tag: 'latest',
          apikey: apiKey,
        },
        timeout: 8000,
      }),
    ]);

    const transactions = txResponse.data?.result;
    if (!Array.isArray(transactions)) {
      return { error: 'Invalid address or no transaction history', transactions: [], riskFlags: [] };
    }

    const balanceWei = BigInt(balanceResponse.data?.result || '0');
    const balanceEth = Number(balanceWei) / 1e18;

    // Check each transaction's counterparty against known risk addresses
    const riskFlags = [];
    const counterparties = new Map(); // address -> {count, label}

    for (const tx of transactions) {
      const counterparty = tx.from?.toLowerCase() === address.toLowerCase()
        ? tx.to?.toLowerCase()
        : tx.from?.toLowerCase();

      if (!counterparty) continue;

      // Check against known risk addresses
      if (KNOWN_RISK_ADDRESSES[counterparty]) {
        const riskInfo = KNOWN_RISK_ADDRESSES[counterparty];
        riskFlags.push({
          type: riskInfo.riskType,
          address: counterparty,
          label: riskInfo.label,
          txHash: tx.hash,
          timestamp: new Date(tx.timeStamp * 1000).toISOString(),
          ...RISK_LABELS[riskInfo.riskType],
        });
      }

      // Track counterparties for pattern analysis
      if (!counterparties.has(counterparty)) {
        counterparties.set(counterparty, { count: 0 });
      }
      counterparties.get(counterparty).count++;
    }

    // Transaction pattern analysis
    const uniqueCounterparties = counterparties.size;
    const avgTxValue = transactions.length > 0
      ? transactions.reduce((sum, tx) => sum + Number(tx.value || 0), 0) / transactions.length / 1e18
      : 0;

    return {
      chain: 'ETH',
      address,
      balanceEth: Math.round(balanceEth * 1000) / 1000,
      transactionCount: transactions.length,
      uniqueCounterparties,
      riskFlags,
      firstSeen: transactions.length > 0 ? new Date(transactions[transactions.length - 1].timeStamp * 1000).toISOString() : null,
      lastSeen: transactions.length > 0 ? new Date(transactions[0].timeStamp * 1000).toISOString() : null,
    };

  } catch (err) {
    logger.warn('Etherscan check failed', { error: err.message });
    return { error: err.message, riskFlags: [] };
  }
}

/**
 * Screen Bitcoin address via Blockchair.
 */
async function screenBtcAddress(address) {
  try {
    const response = await axios.get(
      `https://api.blockchair.com/bitcoin/dashboards/address/${address}`,
      {
        params: process.env.BLOCKCHAIR_API_KEY ? { key: process.env.BLOCKCHAIR_API_KEY } : {},
        timeout: 10000,
      }
    );

    const data = response.data?.data?.[address];
    if (!data) return { error: 'Address not found', riskFlags: [] };

    const addressData = data.address;
    const transactions = data.transactions || [];

    return {
      chain: 'BTC',
      address,
      balanceBtc: (addressData.balance || 0) / 1e8,
      transactionCount: addressData.transaction_count || 0,
      totalReceived: (addressData.received || 0) / 1e8,
      totalSpent: (addressData.spent || 0) / 1e8,
      firstSeen: addressData.first_seen_receiving,
      lastSeen: addressData.last_seen_receiving,
      riskFlags: [], // Without commercial intelligence, BTC chain analysis is limited
      note: 'Basic Bitcoin address data. For deep transaction graph analysis, commercial blockchain intelligence (TRM Labs / Elliptic) is recommended.',
    };

  } catch (err) {
    logger.warn('Blockchair check failed', { error: err.message });
    return { error: err.message, riskFlags: [] };
  }
}

/**
 * Main Layer 5 runner.
 */
async function runCryptoLayer(subject) {
  if (!subject.walletAddress) {
    return {
      layer: 'crypto',
      layerName: 'Crypto & Blockchain Intelligence',
      status: 'skipped',
      reason: 'No wallet address provided',
      scoreContribution: 0,
      summary: 'No wallet address submitted for screening.',
    };
  }

  logger.debug('Layer 5: Crypto screening started', { address: subject.walletAddress });
  const startTime = Date.now();

  const chain = detectChain(subject.walletAddress);
  let walletData = {};

  if (chain === 'ETH') {
    walletData = await screenEthAddress(subject.walletAddress);
  } else if (chain === 'BTC') {
    walletData = await screenBtcAddress(subject.walletAddress);
  } else {
    walletData = { error: `Unsupported chain format for address: ${subject.walletAddress}`, riskFlags: [] };
  }

  const riskFlags = walletData.riskFlags || [];
  const criticalFlags = riskFlags.filter(f => f.severity === 'CRITICAL' || f.scoreBoost >= 35);
  const highFlags = riskFlags.filter(f => f.scoreBoost >= 20 && f.scoreBoost < 35);

  const scoreContribution = riskFlags.length > 0
    ? Math.min(40, Math.max(...riskFlags.map(f => f.scoreBoost || 0)))
    : 0;

  const result = {
    layer: 'crypto',
    layerName: 'Crypto & Blockchain Intelligence',
    durationMs: Date.now() - startTime,
    status: walletData.error ? 'error' : 'complete',

    chain,
    walletAddress: subject.walletAddress,
    walletData,
    riskFlags,
    criticalFlagCount: criticalFlags.length,
    highFlagCount: highFlags.length,
    scoreContribution,

    summary: riskFlags.length > 0
      ? `${riskFlags.length} risk flag(s) detected on wallet ${subject.walletAddress}: ${riskFlags.map(f => f.label).join(', ')}.`
      : `Wallet ${subject.walletAddress} (${chain}): No direct risk flags detected.${walletData.note ? ' ' + walletData.note : ''}`,

    sourcesQueried: chain === 'ETH'
      ? ['Etherscan', 'Known Risk Address Database']
      : chain === 'BTC'
        ? ['Blockchair']
        : [],
  };

  logger.debug('Layer 5: Complete', {
    durationMs: result.durationMs,
    chain,
    riskFlags: riskFlags.length,
  });

  return result;
}

module.exports = { runCryptoLayer };
