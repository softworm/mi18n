const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};
let outputChannel;
let currentLogLevel = LogLevel.INFO;

function initOutputChannel(channel) {
  outputChannel = channel;
}

function setLogLevel(level) {
  currentLogLevel = level;
}

function logDebug(message) {
  if (currentLogLevel <= LogLevel.DEBUG) {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[${timestamp}][DEBUG] ${message}`);
  }
}

// 辅助函数：记录普通消息
function logInfo(message) {
  if (currentLogLevel <= LogLevel.ERROR) {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[${timestamp}][INFO] ${message}`);
  }
}

// 辅助函数：记录错误
function logError(msg, error) {
  if (currentLogLevel <= LogLevel.ERROR) {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[${timestamp}][ERROR] ${msg} ${error}`);
  }
}

// 辅助函数：记录对象
function logObject(msg, obj) {
  const timestamp = new Date().toISOString();
  outputChannel.appendLine(`[${timestamp}][OBJECT] ${msg} ` + JSON.stringify(obj, null, 2));
}

const logger = {
  initOutputChannel,
  setLogLevel,
  LogLevel,
  logDebug,
  logInfo,
  logError,
  logObject
};

export default logger;