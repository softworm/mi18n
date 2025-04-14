import * as vscode from 'vscode';
import { Utils } from './utils';
import { VSCodeUI } from './utils/vscode-ui';
import { FileIO } from './utils/fileIO';
import { Config } from './utils/config';
import { MessageType, Message } from './utils/message';
import { ViewLoader } from './view/ViewLoader';
import logger from './utils/log';
const fs = require('fs');
const isEmpty = require('lodash/isEmpty');

interface LangType {
	defaultKey: string;
	language: object;
	langFilePath?: object;
	filePath?: string;
	type?: string;
};

let langObj: LangType = null;

export async function activate(context: vscode.ExtensionContext) {
	try {
    logger.initOutputChannel(vscode.window.createOutputChannel('mi18n'));
    logger.setLogLevel(logger.LogLevel.DEBUG);
    logger.logInfo('mi18n is now active');

		const config = new Config();
		// 初始化
		config.init(context, () => {
			// 渲染语言
			VSCodeUI.renderDecoration(config);
			logger.logInfo("config init complete");
		});

		// 监听文件保存
		vscode.workspace.onDidSaveTextDocument(
			async (document) => {
				let activeEditor = vscode.window.activeTextEditor;
				if (activeEditor && activeEditor.document === document) {
					const fileName = activeEditor.document.fileName;	
					const fileReg = config.getFileReg();
					const jsonReg = config.getJsonReg();			
					if (jsonReg.test(fileName)) {// 需要扩展
						let transSourcePaths = config.getTransSourcePaths();
						transSourcePaths = transSourcePaths.replace(/\*/g, '');
						// logger.logInfo('transSourcePaths', fileName, transSourcePaths);
						if (FileIO.isIncludePath(fileName, transSourcePaths)) {
							// logger.logInfo('setTransSourceObj');
							// 更新翻译源
							await config.setTransSourceObj(() => {}, false);
						}
						const configFilePath = config.getConfigFilePath();
						if (FileIO.isIncludePath(fileName, configFilePath)) {
							config.init(context, () => {});
							logger.logObject("deyi2", config);
						}
					}
					if (fileReg.test(fileName)) {
						// 渲染语言
						VSCodeUI.renderDecoration(config);
					}
				}
			},
			null,
			context.subscriptions
		);

		// 监听活动文件窗口
		vscode.window.onDidChangeActiveTextEditor(async editor => {
			const activeEditor = vscode.window.activeTextEditor;
			if (activeEditor && activeEditor.document === editor?.document) {
				// 渲染语言
				VSCodeUI.renderDecoration(config);
			}
		});

		// 监听命令-扫描中文
		context.subscriptions.push(vscode.commands.registerTextEditorCommand(
			'extension.mi18n.scanAndGenerate', 
			async function () {
				logger.logInfo("开始扫描中文");
				try {
					const activeEditor = vscode.window.activeTextEditor;
					if (activeEditor) {
						const { fileName } = activeEditor.document || {};
						const initLang = config.getTranslateLangs();
						const keys = config.getQuoteKeys();
						const defaultLang = config.getDefaultLang();
						const prefixKey = config.getPrefixKey(fileName);
						const tempPaths = config.getTempPaths();
						const pageEnName = config.generatePageEnName(fileName);
						const tempFileName = config.getTempFileName();
						const isNeedRandSuffix = config.getIsNeedRandSuffix();
						const isSingleQuote = config.getIsSingleQuote();
						const keyBoundaryChars = config.getKeyBoundaryChars();
						const vueReg = config.getVueReg();
						const isHookImport = config.getIsHookImport();
						const handleRefresh = async () => {
							await config.refreshGlobalLangObj();
							VSCodeUI.renderDecoration(config);
						};
            
            if(Utils.shouldIgnorePath(fileName, config.getIgnorePaths())){
              logger.logInfo(`按配置规则，已忽略此文件 ${fileName}`);
              return;
            }

						Utils.handleScanAndInit(fileName, initLang, keys, defaultLang, prefixKey, isSingleQuote, keyBoundaryChars, vueReg, isHookImport, (newLangObj) => {
							if (!isEmpty(newLangObj)) {
								FileIO.writeIntoTempFile(tempPaths, fileName, newLangObj, pageEnName, tempFileName, isNeedRandSuffix, async () => {
									if (config.isOnline()) {
										config.handleSendToOnline(newLangObj, pageEnName, async () => {
											handleRefresh();
										});
									} else {
										handleRefresh();
									}
								});
							}
						});
					}
				} catch(e) {
					logger.logError("scanAndGenerate e", e);
				}
			})
		);

		// 监听命令-批量扫描中文
		context.subscriptions.push(
			vscode.commands.registerTextEditorCommand(
				'extension.mi18n.multiScanAndGenerate',
				async () => {
					const folderUri = await vscode.window.showOpenDialog({
						canSelectFiles: false,
						canSelectFolders: true,
						canSelectMany: false,
					});

					const handleRefresh = async () => {
						await config.refreshGlobalLangObj();
						VSCodeUI.renderDecoration(config);
					};
		
					if (folderUri && folderUri.length > 0) {
						const folderPath = folderUri[0].fsPath;
						const initLang = config.getTranslateLangs();
						const keys = config.getQuoteKeys();
						const isSingleQuote = config.getIsSingleQuote();
						const defaultLang = config.getDefaultLang();
						const tempPaths = config.getTempPaths();
            const ignorePaths = config.getIgnorePaths();

						FileIO.getFolderFiles(folderPath, ignorePaths)
							.then(async (files: any[]) => {
								files.forEach((file: any, i: number) => {
									logger.logObject('开始处理文件', file);
								  const fileName = file;
									const prefixKey = config.getPrefixKey(fileName, i.toString());
									const pageEnName = config.generatePageEnName(fileName);
									const tempFileName = config.getTempFileName();
									const isNeedRandSuffix = config.getIsNeedRandSuffix();
									const keyBoundaryChars = config.getKeyBoundaryChars();
									const vueReg = config.getVueReg();
									const isHookImport = config.getIsHookImport();
									
									Utils.handleScanAndInit(fileName, initLang, keys, defaultLang, prefixKey, isSingleQuote, keyBoundaryChars, vueReg, isHookImport, (newLangObj) => {
										if (!isEmpty(newLangObj)) {
											FileIO.writeIntoTempFile(tempPaths, fileName, newLangObj, pageEnName, tempFileName, isNeedRandSuffix, async () => {
												if (config.isOnline()) {
													config.handleSendToOnline(newLangObj, pageEnName, async () => {
														if (i === files.length - 1) {
															handleRefresh();
														}
													});
												} else {
													if (i === files.length - 1) {// TODO: 这里其实用promise.all更好，但改造多层回调成本太大，暂且这样
														handleRefresh();
													}
												}
											});
										}
									});
								});
							})
							.catch((e) => {
								logger.logError('getFolderFiles e', e);
							});
					}
				}
			)
		);

		// 监听命令-在线翻译
		context.subscriptions.push(vscode.commands.registerTextEditorCommand(
			'extension.mi18n.translateFromChineseKey', 
			async function () {
				try {
					// logger.logInfo("vscode 中文转译")
					const langKey = VSCodeUI.userKey || config.getDefaultLang();
					const tempPaths = config.getTempPaths();
					const isOverWriteLocal = config.getIsOverWriteLocal();

					const handleTranslate = async (sourObj: any = {}, filePath: string = '') => {
						// logger.logInfo("transSourceObj", transSourceObj);
						await Utils.translateLocalFile(sourObj, langKey, tempPaths, filePath, isOverWriteLocal);
						if (!config.isOnline()) {
							await config.refreshGlobalLangObj();
						}
					};

					if (config.isOnline()) {
						const transSourceObj = config.getTransSourceObj();
						// logger.logInfo('transSourceObj', transSourceObj);
						if (isEmpty(transSourceObj)) {
							await config.setTransSourceObj((data) => {
								handleTranslate(data);
							});
						} else {
							handleTranslate(transSourceObj);
						}
					} else {// 调用百度翻译
						if (config.getIsOnlineTrans() === false) {
							if (!config.getBaiduAppid() || !config.getBaiduSecrectKey()) {
								vscode.window.showWarningMessage(`isOnlineTrans设置为false后，请开通百度翻译账号，并在du-i18n.config.json文件中设置自己专属的baiduAppid和baiduSecrectKey`);
								return;
							}
						}
						
						const activeEditor = vscode.window.activeTextEditor;
						if (activeEditor) {
							const { fileName } = activeEditor.document || {};
							const tempPaths = config.getTempPaths();
							const tempPathName = tempPaths.replace(/\*/g, '');
							// logger.logInfo('fileName', fileName, tempPathName);
							if (fileName && FileIO.isIncludePath(fileName, tempPathName) && /\.(json)$/.test(fileName)) {
								const baiduAppid = config.getBaiduAppid();
								const baiduSecrectKey = config.getBaiduSecrectKey();
								if (!/\.(json)$/.test(fileName)) {return;}
								const data = fs.readFileSync(fileName, 'utf-8');
								if (!data) {return;}
								const localLangObj = eval(`(${data})`);
								// 调用百度翻译
								const { transSourceObj, message } = await Utils.getTransSourceObjByBaidu(localLangObj, langKey, baiduAppid, baiduSecrectKey, isOverWriteLocal);
								// logger.logInfo('transSourceObj', transSourceObj);
								if (!isEmpty(transSourceObj)) {
									handleTranslate(transSourceObj, fileName);
								} else {
									Message.showMessage(message, MessageType.WARNING);
								}
							} else {
								Message.showMessage(`单个文件调用在线翻译，请到目录${tempPaths}的翻译文件中调用该命令`, MessageType.WARNING);
							}
						}
					}
				} catch(e) {
					logger.logError('在线翻译失败', e);
				}
			})
		);

		// 设置
		context.subscriptions.push(vscode.commands.registerTextEditorCommand(
			'extension.mi18n.setting', 
			async function () {
				const activeEditor = vscode.window.activeTextEditor;
				if (activeEditor) {
					const { fileName } = activeEditor.document || {};
					config.openSetting(fileName, (isInit) => {
						if (isInit) {
							config.init(context, () => {});
							logger.logObject("deyi2", config);
						}
					});
				}
			})
		);

		// 监听命令-切换显示语言
		context.subscriptions.push(vscode.commands.registerTextEditorCommand(
			'extension.mi18n.change', 
			async function () {
				// 多语言平台
				const defaultLang = config.getDefaultLang();
				const tempLangs = config.getTempLangs();
				const langKey = VSCodeUI.userKey || defaultLang;
				if (Array.isArray(tempLangs) && tempLangs.length) {
					const items = tempLangs.map((k) => ({ label: k, value: k }));
					const selected = await vscode.window.showQuickPick(items, { placeHolder: langKey });
					if (selected && selected.value !== VSCodeUI.userKey) {
						VSCodeUI.userKey = selected.value;
						if (config.isOnline()) {
							await config.getOnlineLanguage(VSCodeUI.userKey);
						}
						// 重新渲染
						VSCodeUI.renderDecoration(config);
					}
				}
			})
		);

		// 监听自定义命令-用于接收下一层返回的数据并进行处理
		context.subscriptions.push(vscode.commands.registerCommand(
			'extension.mi18n.receive', 
			async function (event) {
				logger.logObject("registerCommand callback extension.mi18n.receive", event);
				if (event) {
					const vueReg = config.getVueReg();
					switch(event.type) {
						case 'READY':// 渲染完成，可以传递参数
							const { defaultKey, language={}, type } = langObj || {};
							const langKey = VSCodeUI.userKey || defaultKey;
							const payload = {
								defaultLang: langKey,
								langs: Object.keys(language),
								defaultFormat: type
							};
							ViewLoader.postMessageToWebview({
								type: 'TRANSLATE-POST',
								payload,
							});
							break;

						case 'TRANSLATE-WRITE':// 写入文件
							const data = event.payload || {};
							if (data.lang) {
								const { langFilePath={}, filePath, type } = langObj || {};
								const fsPath = langFilePath[data.lang] || filePath;
								if (fsPath && data.text) {
									if (FileIO.writeJsonFileSync(fsPath, data.text)) {
										return ViewLoader.postMessageToWebview({
											type: 'TRANSLATE-SHOWMSG',
											payload: true,
										});
									}
								}
							}
							return ViewLoader.postMessageToWebview({
								type: 'TRANSLATE-SHOWMSG',
								payload: false,
							});
					}
				}
			})
		);

		// 监听命令-批量新增
		context.subscriptions.push(vscode.commands.registerTextEditorCommand(
			'extension.mi18n.add', 
			async function () {
				ViewLoader.showWebview(context);
			})
		);

		// 监听命令-刷新
		context.subscriptions.push(vscode.commands.registerTextEditorCommand(
			'extension.mi18n.updateLocalLangPackage', 
			async function () {
				await config.refreshGlobalLangObj(true);
				// 重新渲染
				VSCodeUI.renderDecoration(config);
				vscode.window.showInformationMessage(`翻译数据刷新成功`);
			})
		);
		// 监听命令-文件统计
		context.subscriptions.push(vscode.commands.registerTextEditorCommand(
			'extension.mi18n.analytics', 
			async function () {
				const selectFolder = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, });
				// logger.logInfo("selectFolder", selectFolder);
				if (!selectFolder || !selectFolder[0] || !selectFolder[0].path) {return;}
				const result: any = await Utils.handleAnalystics(selectFolder[0].path, config.getBigFileLineCount());
				logger.logObject("result", result);
				const panel = vscode.window.createWebviewPanel(
					'analyticsResult',
					'分析与统计-结果',
					vscode.ViewColumn.Two,
					{}
				);
				// 设置HTML内容
				let str = ``;
				if (result && !isEmpty(result.fileTypeObj)) {
					str += `文件统计（类型/个数）：<br/>\n`;
					str += Object.entries(result.fileTypeObj).map(([k, v]) => (k + ' ' + v)).join('\n<br/>\n');
					str += '\n<br/>';
					str += ('文件总数：' + Object.values(result.fileTypeObj).reduce((pre: any, v: any) => (pre + v), 0) + '\n<br/>\n');
					str += '\n<br/>\n<br/>';
					str += `index文件（类型/个数）：<br/>\n`;
					str += Object.entries(result.indexFileObj).map(([k, v]) => (k + ' ' + v)).join('\n<br/>\n');
					str += Object.keys(result.indexFileObj).length ? '' : '无';
					str += '\n<br/>\n<br/>\n<br/>';
					str += `大文件统计（路径/行数）：<br/>\n`;
					if (!isEmpty(result.bigFileList)) {
						result.bigFileList.forEach((item: any) => {
							str += `${item.path}   ${item.count}`;
							str += '<br/>\n';
						});
					} else {
						str += `无\n`;
					}
					panel.webview.html = str;
				} else {
					panel.webview.html = `暂无数据`;
				}
			})
		);


		// 监听命令-翻译漏检
		context.subscriptions.push(vscode.commands.registerTextEditorCommand(
			'extension.mi18n.missingDetection', 
			async function () {
				const activeEditor = vscode.window.activeTextEditor;
				if (activeEditor) {
					const { fileName } = activeEditor.document || {};
					const missCheckResultPath = config.getMissCheckResultPath();
					const result: any = await config.handleMissingDetection();
					logger.logObject("result", result);
					let str = `翻译漏检-结果：\n`;
					if ((!isEmpty(result))) {
						const missTranslateKeys = result.missTranslateKeys;
						delete result.missTranslateKeys;
						str += missTranslateKeys.join('\n');
						str += '\n\n';
						str += '详情如下：\n';
						str += JSON.stringify(result, null, '\t');
					} else if (result !== null) {
						str += `太棒了，已全部翻译完成！！！`;
					} else {
						str += `无翻译数据`;
					}
					const filePath: any = await FileIO.writeContentToLocalFile(fileName, missCheckResultPath, str);
					if (filePath) {
						vscode.workspace.openTextDocument(filePath).then((doc) => {
							vscode.window.showTextDocument(doc);
						});
					}
				}
			})
		);

		// 监听命令-合并语言文件
		context.subscriptions.push(vscode.commands.registerTextEditorCommand(
			'extension.mi18n.mergeLangFile', 
			async function () {
				const activeEditor = vscode.window.activeTextEditor;
				if (activeEditor) {
					const { fileName } = activeEditor.document || {};
						// 更新本地语言
					await config.readLocalGlobalLangObj();
					// 合并语言包
					const localLangObj = config.getLocalLangObj();
					const tempPaths = config.getTempPaths();
					const langFileName = 'lang.json';
					if (!tempPaths) {return;}
					FileIO.generateMergeLangFile(tempPaths, fileName, langFileName, localLangObj, () => {
						Message.showMessage(`合并成功`, MessageType.INFO);
					});
				}
			})
		);

		// 监听命令-拆分语言文件
		context.subscriptions.push(vscode.commands.registerTextEditorCommand(
			'extension.mi18n.splitLangFile', 
			async function () {
				const activeEditor = vscode.window.activeTextEditor;
				if (activeEditor) {
					const { fileName } = activeEditor.document || {};
						// 更新本地语言
					await config.readLocalGlobalLangObj();
					// 拆分语言包
					const localLangObj = config.getLocalLangObj();
					const langPaths = config.getLangPaths();
					if (!langPaths) {return;}
					FileIO.generateSplitLangFile(langPaths, fileName, localLangObj, () => {
						Message.showMessage(`拆分成功`, MessageType.INFO);
					});
				}
			})
		);

	} catch(e) {
		logger.logError("du-i18n activate error", e);
	}
}

export function deactivate() {}
