export type Language = 'zh-CN' | 'en-US';

export const DEFAULT_LANGUAGE: Language = 'zh-CN';
export const LANGUAGE_STORAGE_KEY = 'options-heatmap-language';

export const LANGUAGE_OPTIONS: Array<{ value: Language; label: string; shortLabel: string }> = [
  { value: 'zh-CN', label: '简体中文', shortLabel: '中文' },
  { value: 'en-US', label: 'English', shortLabel: 'EN' }
];

export function isLanguage(value: unknown): value is Language {
  return value === 'zh-CN' || value === 'en-US';
}

export const TEXT = {
  'zh-CN': {
    app: {
      errorTitle: '无法加载期权敞口',
      tryAgain: '重试',
      loadingHeatmap: '正在加载热力图',
      riskFooter: '仅供信息研究使用。若数据源未提供 vanna，VEX 会使用模型估算。'
    },
    toolbar: {
      brandTitle: '期权热力图',
      openMenu: '打开菜单',
      ticker: 'Ticker 代码',
      underlyingQuote: '标的报价',
      dataStatus: '数据状态',
      metricToggle: '指标切换',
      provider: '数据源',
      auto: '自动',
      demo: '演示',
      moomoo: 'Moomoo',
      expirations: '到期列数',
      strikeRange: '行权价范围',
      refresh: '刷新',
      settings: '设置',
      filters: '筛选',
      appMenu: '应用菜单',
      quickSymbols: '快捷标的',
      gexView: 'GEX 视图',
      vexView: 'VEX 视图',
      refreshData: '刷新数据',
      done: '完成',
      language: '语言',
      languageToggle: '语言切换',
      openDLiveData: 'OpenD 实时数据',
      demoData: '演示数据',
      liveStatus: 'OpenD',
      demoStatus: '演示',
      updated: (age: string) => `更新于 ${age}`,
      columns: (value: number) => `${value} 列`
    },
    heatmap: {
      heatmapLabel: (metric: string) => `${metric} 热力图`,
      strike: '行权价',
      cellLabel: (metric: string, value: string, strike: number, expiration: string) =>
        `${metric} ${value}，行权价 ${strike}，到期日 ${expiration}`,
      exposurePerUnderlyingMove: '每 1% 标的价格变动的敞口',
      exposurePerVolMove: '每 1% 波动率变动的敞口',
      highestAbsoluteWall: '绝对值最高墙'
    },
    details: {
      cellDetails: '单元格详情',
      emptyPrompt: '选择任意热力图单元格，查看合约级敞口输入。',
      selectedCellDetails: '已选单元格详情',
      clearSelectedCell: '清除已选单元格',
      tabs: '单元格详情标签',
      summary: '摘要',
      breakdown: '拆分',
      netMetric: (metric: string) => `净 ${metric}`,
      vexUnit: '基于模型估算，每 1% 波动率变动',
      gexUnit: '每 1% 标的价格变动',
      callMetric: (metric: string) => `Call ${metric}`,
      putMetric: (metric: string) => `Put ${metric}`,
      keyMetrics: '关键指标',
      callOi: 'Call OI',
      putOi: 'Put OI',
      gammaCall: 'Call Gamma',
      gammaPut: 'Put Gamma',
      vannaCall: 'Call Vanna',
      vannaPut: 'Put Vanna',
      ivMid: 'IV 中值',
      contracts: '合约数',
      exposureBreakdown: '敞口拆分',
      callPutBreakdown: 'Call 和 Put 敞口拆分',
      side: '方向',
      call: 'Call',
      put: 'Put',
      net: '净值',
      sideInputs: '分侧输入',
      openInterest: '未平仓量',
      avgGamma: '平均 Gamma',
      avgVanna: '平均 Vanna',
      modelNotes: '模型说明',
      strike: '行权价',
      expiration: '到期日',
      underlying: '标的',
      source: '来源',
      dataUpdated: '数据更新',
      staleWarning: '该单元格包含过期报价输入。'
    },
    summary: {
      exposureSummary: '敞口摘要',
      totalGex: '总 GEX',
      totalVex: '总 VEX',
      zeroGamma: '零 Gamma 估计',
      callWall: 'Call 墙',
      putWall: 'Put 墙',
      topExpiration: '主要到期日',
      perOneMove: '每 1% 变动',
      modelDerived: '模型估算',
      spot: (value: string) => `现价 ${value}`
    }
  },
  'en-US': {
    app: {
      errorTitle: 'Could not load options exposure',
      tryAgain: 'Try again',
      loadingHeatmap: 'Loading heatmap',
      riskFooter: 'Informational research tool only. VEX is model-derived when provider vanna is unavailable.'
    },
    toolbar: {
      brandTitle: 'Options Heatmap',
      openMenu: 'Open menu',
      ticker: 'Ticker',
      underlyingQuote: 'Underlying quote',
      dataStatus: 'Data status',
      metricToggle: 'Metric toggle',
      provider: 'Provider',
      auto: 'Auto',
      demo: 'Demo',
      moomoo: 'Moomoo',
      expirations: 'Expirations',
      strikeRange: 'Strike Range',
      refresh: 'Refresh',
      settings: 'Settings',
      filters: 'Filters',
      appMenu: 'App menu',
      quickSymbols: 'Quick Symbols',
      gexView: 'GEX View',
      vexView: 'VEX View',
      refreshData: 'Refresh data',
      done: 'Done',
      language: 'Language',
      languageToggle: 'Language toggle',
      openDLiveData: 'OpenD live data',
      demoData: 'Demo data',
      liveStatus: 'OpenD',
      demoStatus: 'Demo',
      updated: (age: string) => `Updated ${age}`,
      columns: (value: number) => `${value} columns`
    },
    heatmap: {
      heatmapLabel: (metric: string) => `${metric} heatmap`,
      strike: 'Strike',
      cellLabel: (metric: string, value: string, strike: number, expiration: string) =>
        `${metric} ${value} at strike ${strike} expiration ${expiration}`,
      exposurePerUnderlyingMove: 'Exposure per 1% underlying move',
      exposurePerVolMove: 'Exposure per 1% volatility move',
      highestAbsoluteWall: 'Highest absolute wall'
    },
    details: {
      cellDetails: 'Cell Details',
      emptyPrompt: 'Select any heatmap cell to inspect contract-level exposure inputs.',
      selectedCellDetails: 'Selected cell details',
      clearSelectedCell: 'Clear selected cell',
      tabs: 'Cell detail tabs',
      summary: 'Summary',
      breakdown: 'Breakdown',
      netMetric: (metric: string) => `Net ${metric}`,
      vexUnit: 'model-derived per 1% vol move',
      gexUnit: 'per 1% underlying move',
      callMetric: (metric: string) => `Call ${metric}`,
      putMetric: (metric: string) => `Put ${metric}`,
      keyMetrics: 'Key Metrics',
      callOi: 'Call OI',
      putOi: 'Put OI',
      gammaCall: 'Gamma Call',
      gammaPut: 'Gamma Put',
      vannaCall: 'Vanna Call',
      vannaPut: 'Vanna Put',
      ivMid: 'IV Mid',
      contracts: 'Contracts',
      exposureBreakdown: 'Exposure Breakdown',
      callPutBreakdown: 'Call and put exposure breakdown',
      side: 'Side',
      call: 'Call',
      put: 'Put',
      net: 'Net',
      sideInputs: 'Side Inputs',
      openInterest: 'Open Interest',
      avgGamma: 'Avg Gamma',
      avgVanna: 'Avg Vanna',
      modelNotes: 'Model Notes',
      strike: 'Strike',
      expiration: 'Expiration',
      underlying: 'Underlying',
      source: 'Source',
      dataUpdated: 'Data Updated',
      staleWarning: 'This cell has stale quote inputs.'
    },
    summary: {
      exposureSummary: 'Exposure summary',
      totalGex: 'Total GEX',
      totalVex: 'Total VEX',
      zeroGamma: 'Zero Gamma Est.',
      callWall: 'Call Wall',
      putWall: 'Put Wall',
      topExpiration: 'Top Expiration',
      perOneMove: 'per 1% move',
      modelDerived: 'model-derived',
      spot: (value: string) => `Spot ${value}`
    }
  }
} as const;

const ASSUMPTIONS_ZH: Record<string, string> = {
  'GEX is gamma * open interest * contract size * spot^2 * 0.01.':
    'GEX = gamma * 未平仓量 * 合约乘数 * 标的价格^2 * 0.01。',
  'Call exposure is signed positive and put exposure is signed negative.':
    'Call 敞口按正值处理，Put 敞口按负值处理。',
  'VEX uses provider vanna when present; otherwise it uses Black-Scholes vanna derived from IV and time to expiry.':
    '若数据源提供 vanna，VEX 优先使用该值；否则使用由 IV 和到期时间推导的 Black-Scholes vanna。'
};

const MESSAGE_ZH: Record<string, string> = {
  'Demo data is deterministic sample data. Configure Moomoo OpenD for live chain snapshots.':
    '演示数据为确定性样本数据。如需实时期权链快照，请配置 Moomoo OpenD。',
  'Moomoo OpenD returned no usable option contracts.': 'Moomoo OpenD 未返回可用的期权合约。',
  'Moomoo OpenD returned an invalid underlying price.': 'Moomoo OpenD 返回的标的价格无效。',
  'No JSON object found in helper output.': '辅助程序输出中未找到 JSON 对象。'
};

export function localizeAssumption(assumption: string, language: Language): string {
  if (language === 'zh-CN') {
    return ASSUMPTIONS_ZH[assumption] ?? assumption;
  }
  return assumption;
}

export function localizeSourceName(source: string, language: Language): string {
  if (language !== 'zh-CN') {
    return source;
  }

  if (source === 'Demo') {
    return '演示数据';
  }
  if (source === 'Demo fallback') {
    return '演示回退';
  }
  return source;
}

export function localizeRuntimeMessage(message: string, language: Language): string {
  if (language !== 'zh-CN') {
    return message;
  }

  if (MESSAGE_ZH[message]) {
    return MESSAGE_ZH[message];
  }

  const fallbackPrefix = 'Moomoo OpenD unavailable, using demo data. ';
  if (message.startsWith(fallbackPrefix)) {
    const detail = message.slice(fallbackPrefix.length).trim();
    const localizedDetail = detail ? ` ${localizeRuntimeMessage(detail, language)}` : '';
    return `Moomoo OpenD 暂不可用，已切换为演示数据。${localizedDetail}`;
  }

  const timeoutMatch = message.match(/^Moomoo OpenD helper timed out after (\d+)ms\.$/);
  if (timeoutMatch) {
    return `Moomoo OpenD 辅助程序在 ${timeoutMatch[1]}ms 后超时。`;
  }

  const exitMatch = message.match(/^Moomoo OpenD helper exited with code (\d+)\.$/);
  if (exitMatch) {
    return `Moomoo OpenD 辅助程序退出，代码为 ${exitMatch[1]}。`;
  }

  const invalidJsonMatch = message.match(/^Moomoo OpenD helper returned invalid JSON: (.+)$/);
  if (invalidJsonMatch) {
    return `Moomoo OpenD 辅助程序返回的 JSON 无效：${invalidJsonMatch[1]}`;
  }

  const requestFailedMatch = message.match(/^Request failed with (\d+)$/);
  if (requestFailedMatch) {
    return `请求失败，状态码 ${requestFailedMatch[1]}`;
  }

  return message;
}
