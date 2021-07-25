'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const vscode = require('vscode');
const downloader = require('@microsoft/vscode-file-downloader-api');
const mkdirp = require('mkdirp');
const yauzl = require('yauzl');
const { exec } = require('child_process');

let channel = null;

function findKha(channel) {
	let localkhapath = path.resolve(vscode.workspace.rootPath, 'Kha');
	if (fs.existsSync(localkhapath) && fs.existsSync(path.join(localkhapath, 'Tools', 'khamake', 'out', 'main.js'))) return localkhapath;
	let khapath = vscode.workspace.getConfiguration('kha').khaPath;
	if (khapath.length > 0) {
		return path.isAbsolute(khapath) ? khapath : path.resolve(vscode.workspace.rootPath, khapath);
	}

	if (channel) {
		channel.appendLine('Warning: Falling back to integrated Kha. Consider downloading an up to date version and setting the khaPath option.');
	}
	return path.join(vscode.extensions.getExtension('kodetech.kha').extensionPath, 'Kha');
}

function findFFMPEG() {
	return vscode.workspace.getConfiguration('kha').ffmpeg;
}

function findKhaElectron() {
	const electronPath = path.resolve(getExtensionPath(), 'electron');

	let exec;
	if (os.platform() === 'win32') {
		exec = path.join(electronPath, 'electron.exe');
	}
	else if (os.platform() === 'darwin') {
		exec = path.join(electronPath, 'Electron.app', 'Contents', 'MacOS', 'Electron');
	}
	else {
		exec = path.join(electronPath, 'electron');
	}

	return exec;
}

function compile(target, silent) {
	if (!silent) {
		channel.appendLine('Saving all files.');
		vscode.commands.executeCommand('workbench.action.files.saveAll');
	}

	if (!vscode.workspace.rootPath) {
		channel.appendLine('No project opened.');
		return;
	}

	if (!fs.existsSync(path.join(vscode.workspace.rootPath, 'khafile.js'))) {
		channel.appendLine('No khafile found.');
		return;
	}

	let options = {
		from: vscode.workspace.rootPath,
		to: path.join(vscode.workspace.rootPath, vscode.workspace.getConfiguration('kha').buildDir),
		projectfile: 'khafile.js',
		target: target,
		vr: 'none',
		pch: false,
		intermediate: '',
		graphics: 'default',
		visualstudio: 'vs2019',
		kha: '',
		haxe: '',
		ogg: '',
		aac: '',
		mp3: '',
		h264: '',
		webm: '',
		wmv: '',
		theora: '',
		kfx: '',
		krafix: '',
		ffmpeg: findFFMPEG(),
		nokrafix: false,
		embedflashassets: false,
		compile: true,
		run: false,
		init: false,
		name: 'Project',
		server: false,
		port: 8080,
		debug: false,
		silent: false,
		watch: false,
		shaderversion: 0,
		parallelAssetConversion: 0,
		haxe3: false
	};
	return require(path.join(findKha(channel), 'Tools', 'khamake', 'out', 'main.js'))
	.run(options, {
		info: message => {
			channel.appendLine(message);
		}, error: message => {
			channel.appendLine(message);
		}
	});
}

let KhaHaxeInstallationProvider = {
	activate: (provideInstallation) => {
		provideInstallation({
			haxeExecutable: path.join(findKha(), 'Tools', 'haxe', 'haxe' + sys()),
			haxelibExecutable: null,
			standardLibraryPath: path.join(findKha(), 'Tools', 'haxe', 'std')
		});
	},

	deactivate: () => {}
}

let KhaDisplayArgumentsProvider = {
	init: (api, activationChangedCallback) => {
		this.api = api;
		this.activationChangedCallback = activationChangedCallback;
		this.description = 'Kha project';
	},
	activate: (provideArguments) => {
		this.updateArgumentsCallback = provideArguments;
		if (this.args) {
			this.update(this.args);
		}
		this.activationChangedCallback(true);
	},
	deactivate: () => {
		this.updateArgumentsCallback = null;
		this.activationChangedCallback(false);
	},
	update: (args) => {
		if (this.args !== args && this.api) {
			this.args = args;
			this.parsedArguments = this.api.parseHxmlToArguments(args);
			if (this.updateArgumentsCallback) {
				this.updateArgumentsCallback(this.parsedArguments);
			}
		}
	}
}

function updateHaxeArguments(rootPath, hxmlPath) {
	const hxml = fs.readFileSync(hxmlPath, 'utf8');
	const buildDir = vscode.workspace.getConfiguration('kha').buildDir;
	KhaDisplayArgumentsProvider.update('--cwd ' + path.join(rootPath, buildDir) + '\n' + hxml);
}

function sys() {
	if (os.platform() === 'linux') {
		if (os.arch() === 'arm') return '-linuxarm';
		else if (os.arch() === 'arm64') return '-linuxaarch64';
		else if (os.arch() === 'x64') return '-linux64';
		else return '-linux32';
	}
	else if (os.platform() === 'win32') {
		return '.exe';
	}
	else if (os.platform() === 'freebsd') {
		return '-freebsd';
	}
	else {
		return '-osx';
	}
}

function configureVsHaxe(rootPath) {
	let vshaxe = vscode.extensions.getExtension('nadako.vshaxe').exports;
	KhaDisplayArgumentsProvider.init(vshaxe, (active) => {
		if (!active) return;

		const hxmlPath = path.join(rootPath, 'build', 'project-debug-html5.hxml');
		if (fs.existsSync(hxmlPath)) {
			updateHaxeArguments(rootPath, hxmlPath);
		}
		else {
			compile('debug-html5', true).then(() => {
				updateHaxeArguments(rootPath, hxmlPath);
			});
		}
	});
	vshaxe.registerHaxeInstallationProvider('Kha', KhaHaxeInstallationProvider);
	vshaxe.registerDisplayArgumentsProvider('Kha', KhaDisplayArgumentsProvider);
}

function chmodEverything() {
	if (os.platform() === 'win32') {
		return;
	}
	const base = findKha();
	fs.chmodSync(path.join(base, 'Tools', 'haxe', 'haxe' + sys()), 0o755);
	fs.chmodSync(path.join(base, 'Tools', 'lame', 'lame' + sys()), 0o755);
	fs.chmodSync(path.join(base, 'Tools', 'oggenc', 'oggenc' + sys()), 0o755);
	fs.chmodSync(path.join(base, 'Kinc', 'Tools', 'kraffiti', 'kraffiti' + sys()), 0o755);
	fs.chmodSync(path.join(base, 'Kinc', 'Tools', 'krafix', 'krafix' + sys()), 0o755);
}

function getExtensionPath() {
	return vscode.extensions.getExtension('kodetech.kha').extensionPath;
}

function ResolvePackageTestPath(pkg) {
    if (pkg.installPath) {
        return path.resolve(getExtensionPath(), pkg.installPath);
    }
    return null;
}

function ResolvePackageBinaries(pkg) {
    if (pkg.binaries) {
        return pkg.binaries.map(value => path.resolve(ResolveBaseInstallPath(pkg), value));
    }
    return null;
}

function ResolvePackageLinks(pkg) {
    if (pkg.links) {
        return pkg.links.map(value => path.resolve(ResolveBaseInstallPath(pkg), value));
    }
    return null;
}

function ResolveBaseInstallPath(pkg) {
    let basePath = getExtensionPath();
    basePath = path.resolve(basePath, 'electron');
    return basePath;
}

function ResolveFilePaths(pkg) {
    pkg.installTestPath = ResolvePackageTestPath(pkg);
    pkg.installPath = ResolveBaseInstallPath(pkg);
    pkg.binaries = ResolvePackageBinaries(pkg);
    pkg.links = ResolvePackageLinks(pkg);
}

function filterPlatformPackages(packages) {
    if (packages) {
        return packages.filter(pkg => {
            if (pkg.architectures && pkg.architectures.indexOf(os.arch()) === -1) {
                return false;
            }

            if (pkg.platforms && pkg.platforms.indexOf(os.platform()) === -1) {
                return false;
            }

            return true;
        });
    } else {
        throw 'Package manifest does not exist.';
    }
}

async function directoryExists(filePath) {
    return new Promise((resolve, reject) => {
        fs.stat(filePath, (err, stats) => {
            if (stats && stats.isDirectory()) {
                resolve(true);
            }
			else {
                resolve(false);
            }
        });
    });
}

async function filterAlreadyInstalledPackages(packages) {
	let filtered = [];
	for (let pkg of packages) {
		let testPath = ResolvePackageTestPath(pkg);
		if (!testPath) {
			filtered.push(pkg);
			continue;
		}

		if (!(await directoryExists(testPath))) {
			filtered.push(pkg);
		}
	}
    return filtered;
}

async function filterPackages(packages) {
    let platformPackages = filterPlatformPackages(packages);
    return filterAlreadyInstalledPackages(platformPackages);
}

async function readFile(filepath) {
	return new Promise((resolve, reject) => {
		fs.readFile(filepath, function (err, data) {
			if (err) {
				reject();
			}
			else {
				resolve(data);
			}
		});
	});
}

async function InstallZipSymLinks(buffer, destinationInstallPath, links) {
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipFile) => {
            if (err) {
                let message = 'Kha Extension was unable to download its dependencies. Please check your internet connection. If you use a proxy server, please visit https://aka.ms/VsCodeCsharpNetworking';
                return reject(message);
            }

            zipFile.readEntry();

            zipFile.on('entry', (entry) => {
                let absoluteEntryPath = path.resolve(destinationInstallPath, entry.fileName);

                if (entry.fileName.endsWith('/')) {
                    // Directory - already created
                    zipFile.readEntry();
                } else {
                    // File - symlink it
                    zipFile.openReadStream(entry, (readerr, readStream) => {
                        if (readerr) {
                            return reject('Error reading zip stream');
                        }

                        // Prevent Electron from kicking in special behavior when opening a write-stream to a .asar file
                        let originalAbsoluteEntryPath = absoluteEntryPath;
                        if (absoluteEntryPath.endsWith('.asar')) {
                            absoluteEntryPath += '_';
                        }

                        if (links && links.indexOf(absoluteEntryPath) !== -1) {
                            readStream.setEncoding('utf8');
                            let body = '';
                            readStream.on('data', (chunk) => {
                                body += chunk;
                            });
                            readStream.on('end', () => {
                                // vscode.window.showInformationMessage('Linking ' + absoluteEntryPath + ' and ' + path.join(absoluteEntryPath, body));
                                fs.symlink(body, absoluteEntryPath, undefined, () => {
                                    zipFile.readEntry();
                                });
                            });
                        } else {
                            zipFile.readEntry();
                        }
                    });
                }
            });

            zipFile.on('end', () => {
                resolve();
            });

            zipFile.on('error', ziperr => {
                reject('Zip File Error:' + ziperr.code || '');
            });
        });
    });
}

async function InstallZip(buffer, description, destinationInstallPath, binaries, links) {
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipFile) => {
            if (err) {
                let message = 'Kha Extension was unable to download its dependencies. Please check your internet connection. If you use a proxy server, please visit https://aka.ms/VsCodeCsharpNetworking';
                return reject(message);
            }

            zipFile.readEntry();

            zipFile.on('entry', async (entry) => {
                let absoluteEntryPath = path.resolve(destinationInstallPath, entry.fileName);

                if (entry.fileName.endsWith('/')) {
                    // Directory - create it
                    await mkdirp(absoluteEntryPath, { mode: 0o775 });
                    zipFile.readEntry();
                } else {
                    // File - extract it
                    zipFile.openReadStream(entry, async (readerr, readStream) => {
                        if (readerr) {
                            return reject('Error reading zip stream');
                        }

                        await mkdirp(path.dirname(absoluteEntryPath), { mode: 0o775 });

						// Make sure executable files have correct permissions when extracted
						let fileMode = binaries && binaries.indexOf(absoluteEntryPath) !== -1
							? 0o755
							: 0o664;

						// Prevent Electron from kicking in special behavior when opening a write-stream to a .asar file
						let originalAbsoluteEntryPath = absoluteEntryPath;
						if (absoluteEntryPath.endsWith('.asar')) {
							absoluteEntryPath += '_';
						}

						if (links && links.indexOf(absoluteEntryPath) !== -1) {
							zipFile.readEntry();
						} else {
							readStream.pipe(fs.createWriteStream(absoluteEntryPath, { mode: fileMode }));
							readStream.on('end', () => {
								if (absoluteEntryPath !== originalAbsoluteEntryPath) {
									fs.renameSync(absoluteEntryPath, originalAbsoluteEntryPath);
								}
								zipFile.readEntry();
							});
						}
                    });
                }
            });

            zipFile.on('end', () => {
                InstallZipSymLinks(buffer, destinationInstallPath, links).then(() => {
                    resolve();
                }, (errr) => {
                    reject('Error symlinking');
                });
            });

            zipFile.on('error', ziperr => {
                reject('Zip File Error:' + ziperr.code || '');
            });
        });
    });
}

async function InstallFreeBSD(fsPath, description, destinationInstallPath, binaries, links) {
    return new Promise((resolve, reject) => {
		fs.mkdtemp(path.join(os.tmpdir(), 'electron-'), (err, folder) => {
			if (err) {
				let message = 'Unable to create temporary directory: ' + err;
				reject(message);
			}

			mkdirp(folder, { mode: 0o775 });

			exec('tar xf "' + fsPath + '" -C ' + folder, (err, stdout, stderr) => {
				if (err) {
					let message = 'Unable to extract tarball: ' + err + '\n' + stdout + '\n' + stderr;
					reject(message);
				} else {
					exec('cp -r "' + path.join(folder, 'usr/local/share/electron11') + '" "' + destinationInstallPath + '"', (err, stdout, stderr) => {
					if (err) {
							let message = 'Copy failed: ' + err + '\nSTDOUT:\n' + stdout + '\nSTDERR:\n' + stderr;
							reject(message);
						}
					});
				}
			});
		});
		resolve();
    });
}

async function checkElectron(context) {
	const json = vscode.extensions.getExtension('kodetech.kha').packageJSON;
	const dependencies = json.runtimeDependencies;
	dependencies.forEach(pkg => ResolveFilePaths(pkg));
	let filteredPackages = await filterPackages(dependencies);
	if (filteredPackages) {
        for (let pkg of filteredPackages) {
			vscode.window.showInformationMessage('Downloading Electron...');
			let message = vscode.window.setStatusBarMessage('Downloading Electron...');

			const fileDownloader = await downloader.getApi();

			const filename = os.platform() !== 'freebsd' ? 'electron.zip' : 'electron.txz';

			const file = await fileDownloader.downloadFile(
				vscode.Uri.parse(pkg.url),
				filename,
				context
			);

			if (os.platform() !== 'freebsd') {
				var data = await readFile(file.fsPath);

				await InstallZip(data, pkg.description, pkg.installPath, pkg.binaries, pkg.links);


			} else {
				await InstallFreeBSD(file.fsPath, pkg.description, pkg.installPath, pkg.binaries, pkg.links);
			}

			await fileDownloader.deleteAllItems(context);

			message.dispose();
			vscode.window.showInformationMessage('Finished downloading Electron.');
		}
	}
}

function checkProject(context, rootPath) {
	if (!fs.existsSync(path.join(rootPath, 'khafile.js'))) {
		return;
	}

	if (findKha() === path.join(vscode.extensions.getExtension('kodetech.kha').extensionPath, 'Kha')) {
		chmodEverything()
	}

	configureVsHaxe(rootPath);

	checkElectron(context);

	const configuration = vscode.workspace.getConfiguration();
	const buildDir = vscode.workspace.getConfiguration('kha').buildDir;
	let config = configuration.get('launch');
	config.configurations = config.configurations.filter((value) => {
		return !value.name.startsWith('Kha: ');
	});

	config.configurations.push({
		name: 'Kha: HTML5',
		request: 'launch',
		type: 'pwa-chrome',
		cwd: '${workspaceFolder}/' + buildDir + '/debug-html5',
		runtimeExecutable: '${command:kha.findKhaElectron}',
		runtimeArgs: ["--no-sandbox", "--force-device-scale-factor=1", "."],
		outFiles: [
			'${workspaceFolder}/' + buildDir + '/debug-html5/*.js'
		],
		preLaunchTask: 'Kha: Build for Debug HTML5',
		internalConsoleOptions: 'openOnSessionStart',
		skipFiles: [
			"<node_internals>/**"
		]
	});
	config.configurations.push({
		type: 'krom',
		request: 'launch',
		name: 'Kha: Krom',
		preLaunchTask: 'Kha: Build for Krom',
		internalConsoleOptions: 'openOnSessionStart',
	})
	configuration.update('launch', config, false);
}

const KhaTaskProvider = {
	provideTasks: () => {
		let workspaceRoot = vscode.workspace.rootPath;
		if (!workspaceRoot) {
			return [];
		}

		const systems = [
			{ arg: 'debug-html5', name: 'Debug HTML5', default: true },
			{ arg: 'krom', name: 'Krom', default: false },
			{ arg: 'html5', name: 'HTML5', default: false },
			{ arg: 'windows', name: 'Windows', default: false },
			{ arg: 'windows', name: 'Windows (full build)', default: false, full: true },
			{ arg: 'windows', name: 'Windows (Direct3D 12)', default: false, graphics: 'direct3d12' },
			{ arg: 'windows', name: 'Windows (Direct3D 12, full build)', default: false, full: true, graphics: 'direct3d12' },
			{ arg: 'windows', name: 'Windows (Direct3D 9)', default: false, graphics: 'direct3d9' },
			{ arg: 'windows', name: 'Windows (Direct3D 9, full build)', default: false, full: true, graphics: 'direct3d9' },
			{ arg: 'windows', name: 'Windows (Vulkan)', default: false, graphics: 'vulkan' },
			{ arg: 'windows', name: 'Windows (Vulkan, full build)', default: false, full: true, graphics: 'vulkan' },
			{ arg: 'windows', name: 'Windows (OpenGL)', default: false, graphics: 'opengl' },
			{ arg: 'windows', name: 'Windows (OpenGL, full build)', default: false, full: true, graphics: 'opengl' },
			{ arg: 'windowsapp', name: 'Windows Universal', default: false },
			{ arg: 'windowsapp', name: 'Windows Universal (full build)', default: false, full: true },
			{ arg: 'osx', name: 'macOS', default: false },
			{ arg: 'osx', name: 'macOS (full build)', default: false, full: true },
			{ arg: 'osx', name: 'macOS (OpenGL)', default: false, graphics: 'opengl' },
			{ arg: 'osx', name: 'macOS (OpenGL, full build)', default: false, full: true, graphics: 'opengl' },
			{ arg: 'linux', name: 'Linux', default: false },
			{ arg: 'linux', name: 'Linux (full build)', default: false, full: true },
			{ arg: 'linux', name: 'Linux (Vulkan)', default: false, graphics: 'vulkan' },
			{ arg: 'linux', name: 'Linux (Vulkan, full build)', default: false, full: true, graphics: 'vulkan' },
			{ arg: 'android', name: 'Android', default: false },
			{ arg: 'android', name: 'Android (full build)', default: false, full: true },
			{ arg: 'android-native', name: 'Android (native)', default: false },
			{ arg: 'android-native', name: 'Android (native, full build)', default: false, full: true },
			{ arg: 'ios', name: 'iOS', default: false },
			{ arg: 'ios', name: 'iOS (OpenGL)', default: false, graphics: 'opengl' },
			{ arg: 'pi', name: 'Raspberry Pi', default: false },
			{ arg: 'pi', name: 'Raspberry Pi (full build)', default: false, full: true },
			{ arg: 'tvos', name: 'tvOS', default: false },
			{ arg: 'tizen', name: 'Tizen', default: false },
			{ arg: 'flash', name: 'Flash', default: false },
			{ arg: 'node', name: 'Node.js', default: false },
			{ arg: 'unity', name: 'Unity', default: false },
			{ arg: 'xna', name: 'XNA', default: false },
			{ arg: 'psm', name: 'PlayStation Mobile', default: false },
			{ arg: 'java', name: 'Java', default: false },
			{ arg: 'wpf', name: 'WPF', default: false },
			{ arg: 'ps4', name: 'PlayStation 4', default: false },
			{ arg: 'xboxone', name: 'Xbox One', default: false },
			{ arg: 'switch', name: 'Switch', default: false },
			{ arg: 'freebsd', name: 'FreeBSD', default: false },
			{ arg: 'freebsd', name: 'FreeBSD (full build)', default: false, full: true },
			{ arg: 'freebsd', name: 'FreeBSD (Vulkan)', default: false, graphics: 'vulkan' },
			{ arg: 'freebsd', name: 'FreeBSD (Vulkan, full build)', default: false, full: true, graphics: 'vulkan' },
		];

		let tasks = [];
		for (const system of systems) {
			let args = [system.arg];

			if (system.arg === 'krom' || system.arg === 'debug-html5') {
				args.push('--debug');
			}

			if (findFFMPEG().length > 0) {
				args.push('--ffmpeg');
				args.push(findFFMPEG());
			}

			if (system.full) {
				args.push('--compile');
			}

			if (system.graphics) {
				args.push('--graphics');
				args.push(system.graphics);
			}

			let kind = {
				type: 'Kha',
				target: system.name,
			}

			let task = null;
			let khamakePath = path.join(findKha(), 'make.js');

			// On Windows, git bash shell won't accept backward slashes and will fail,
			// so we explicitly need to convert path to unix-style.
			const winShell = vscode.workspace.getConfiguration('terminal.integrated.shell').get('windows');
			if (os.platform() === 'win32' && winShell && winShell.indexOf('bash.exe') > -1) {
				khamakePath = khamakePath.replace(/\\/g, '/');
			}

			if (vscode.env.appName.includes('Kode')) {
				let exec = process.execPath;
				if (exec.indexOf('Kode Studio Helper') >= 0) {
					const dir = exec.substring(0, exec.lastIndexOf('/'));
					exec = path.join(dir, '..', '..', '..', '..', 'MacOS', 'Electron');
				}
				task = new vscode.Task(kind, `Build for ${system.name}`, 'Kha', new vscode.ProcessExecution(exec, ['--khamake', khamakePath].concat(args), {cwd: workspaceRoot}), ['$haxe-absolute', '$haxe']);
			}
			else {
				task = new vscode.Task(kind, vscode.TaskScope.Workspace, `Build for ${system.name}`, 'Kha', new vscode.ShellExecution('node', [khamakePath].concat(args)), ['$haxe-absolute', '$haxe']);
			}
			task.group = vscode.TaskGroup.Build;
			tasks.push(task);
		}

		return tasks;
	},
	resolveTask: (task, token) => {
		return task;
	}
}

let currentTarget = 'HTML5';

exports.activate = (context) => {
	channel = vscode.window.createOutputChannel('Kha');

	if (vscode.workspace.rootPath) {
		checkProject(context, vscode.workspace.rootPath);
	}

	let provider = vscode.workspace.registerTaskProvider('Kha', KhaTaskProvider);
	context.subscriptions.push(provider);

	// TODO: Figure out why this prevents debugging
	// let debugProvider = vscode.debug.registerDebugConfigurationProvider('electron', KhaDebugProvider);
	// context.subscriptions.push(debugProvider);

	vscode.workspace.onDidChangeWorkspaceFolders((e) => {
		for (let folder of e.added) {
			if (folder.uri.fsPath) {
				checkProject(context, folder.uri.fsPath);
			}
		}
	});

	let disposable = vscode.commands.registerCommand('kha.init', function () {
		if (!vscode.workspace.rootPath) {
			channel.appendLine('No project opened.');
			return;
		}

		if (fs.existsSync(path.join(vscode.workspace.rootPath, 'khafile.js'))) {
			channel.appendLine('A Kha project already exists in the project directory.');
			return;
		}

		require(path.join(findKha(), 'Tools', 'khamake', 'out', 'init.js')).run('Project', vscode.workspace.rootPath, 'khafile.js');
		vscode.commands.executeCommand('workbench.action.reloadWindow');
		vscode.window.showInformationMessage('Kha project created.');
	});

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('kha.findKha', () => {
		return findKha();
	});

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('kha.findFFMPEG', () => {
		return findFFMPEG();
	});

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('kha.findKhaElectron', () => {
		return findKhaElectron();
	});

	context.subscriptions.push(disposable);

	const targetItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	targetItem.text = '$(desktop-download) HTML5';
	targetItem.tooltip = 'Select Completion Target';
	targetItem.command = 'kha.selectCompletionTarget';
	targetItem.show();
	context.subscriptions.push(targetItem);

	disposable = vscode.commands.registerCommand("kha.selectCompletionTarget", () => {
		let items = ['HTML5', 'Krom', 'Kinc', 'Android (Java)', 'Flash', 'HTML5-Worker', 'Java', 'Node.js', 'Unity', 'WPF'];
		vscode.window.showQuickPick(items).then((choice) => {
			if (!choice || choice === currentTarget) {
				return;
			}

			currentTarget = choice;
			targetItem.text = '$(desktop-download) ' + choice;

			function choiceToHxml() {
				switch (choice) {
					case 'HTML5':
						return 'debug-html5';
					case 'Krom':
						return 'krom';
					case 'Kinc':
						switch (process.platform) {
							case 'win32':
								return 'windows';
							case 'darwin':
								return 'osx';
							case 'linux':
								return 'linux';
							default:
								return process.platform;
						}
					case 'Android (Java)':
						return 'android';
					case 'Flash':
						return 'flash';
					case 'HTML5-Worker':
						return 'html5worker';
					case 'Java':
						return 'java';
					case 'Node.js':
						return 'node';
					case 'Unity':
						return 'unity';
					case 'WPF':
						return 'wpf';
				}
			}

			const rootPath = vscode.workspace.rootPath;
			const buildDir = vscode.workspace.getConfiguration('kha').buildDir;
			const hxmlPath = path.join(rootPath, buildDir, 'project-' + choiceToHxml() + '.hxml');
			if (fs.existsSync(hxmlPath)) {
				updateHaxeArguments(rootPath, hxmlPath);
			}
			else {
				compile(choiceToHxml(), true).then(() => {
					updateHaxeArguments(rootPath, hxmlPath);
				});
			}
		});
	});
	context.subscriptions.push(disposable);

	let api = {
		findKha: findKha,
		findFFMPEG: findFFMPEG,
		findKhaElectron: findKhaElectron,
		compile: compile
	};

	return api;
};

exports.deactivate = () => {

};
