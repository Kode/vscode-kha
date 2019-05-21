'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const vscode = require('vscode');

let channel = null;

function findKha() {
	let localkhapath = path.resolve(vscode.workspace.rootPath, 'Kha');
	if (fs.existsSync(localkhapath) && fs.existsSync(path.join(localkhapath, 'Tools', 'khamake', 'out', 'main.js'))) return localkhapath;
	let khapath = vscode.workspace.getConfiguration('kha').khaPath;
	if (khapath.length > 0) {
		return path.isAbsolute(khapath) ? khapath : path.resolve(vscode.workspace.rootPath, khapath);
	}
	return path.join(vscode.extensions.getExtension('kodetech.kha').extensionPath, 'Kha');
}

function findFFMPEG() {
	return vscode.workspace.getConfiguration('kha').ffmpeg;
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
		visualstudio: 'vs2017',
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
	return require(path.join(findKha(), 'Tools', 'khamake', 'out', 'main.js'))
	.run(options, {
		info: message => {
			channel.appendLine(message);
		}, error: message => {
			channel.appendLine(message);
		}
	});
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
		else if (os.arch() === 'x64') return '-linux64';
		else return '-linux32';
	}
	else if (os.platform() === 'win32') {
		return '.exe';
	}
	else {
		return '-osx';
	}
}

function updateHaxe(vshaxe) {
	vshaxe.haxeExecutable.configuration.executable = path.join(findKha(), 'Tools', 'haxe', 'haxe' + sys());
	vshaxe.haxeExecutable.configuration.isCommand = false;
	vshaxe.haxeExecutable.configuration.env = {
		'HAXE_STD_PATH': path.join(findKha(), 'Tools', 'haxe', 'std')
	};
	vshaxe.haxeExecutable._onDidChangeConfiguration.fire(vshaxe.haxeExecutable.configuration);
}

function configureVsHaxe(rootPath) {
	let vshaxe = vscode.extensions.getExtension('nadako.vshaxe').exports;
	KhaDisplayArgumentsProvider.init(vshaxe, (active) => {
		if (!active) return;

		const hxmlPath = path.join(rootPath, 'build', 'project-debug-html5.hxml');
		if (fs.existsSync(hxmlPath)) {
			updateHaxe(vshaxe);
			updateHaxeArguments(rootPath, hxmlPath);
		}
		else {
			compile('debug-html5', true).then(() => {
				updateHaxe(vshaxe);
				updateHaxeArguments(rootPath, hxmlPath);
			});
		}
	});
	updateHaxe(vshaxe);
	vshaxe.registerDisplayArgumentsProvider('Kha', KhaDisplayArgumentsProvider);
}

function chmodEverything() {
	if (os.platform() === 'win32') {
		return;
	}
	const base = findKha();
	fs.chmodSync(path.join(base, 'Tools', 'haxe', 'haxe' + sys()), 0o755);
	fs.chmodSync(path.join(base, 'Tools', 'kravur', 'kravur' + sys()), 0o755);
	fs.chmodSync(path.join(base, 'Tools', 'lame', 'lame' + sys()), 0o755);
	fs.chmodSync(path.join(base, 'Tools', 'oggenc', 'oggenc' + sys()), 0o755);
	fs.chmodSync(path.join(base, 'Kore', 'Tools', 'kraffiti', 'kraffiti' + sys()), 0o755);
	fs.chmodSync(path.join(base, 'Kore', 'Tools', 'krafix', 'krafix' + sys()), 0o755);
}

function checkProject(rootPath) {
	if (!fs.existsSync(path.join(rootPath, 'khafile.js'))) {
		return;
	}

	if (findKha() === path.join(vscode.extensions.getExtension('kodetech.kha').extensionPath, 'Kha')) {
		chmodEverything()
	}

	configureVsHaxe(rootPath);

	const configuration = vscode.workspace.getConfiguration();
	const buildDir = vscode.workspace.getConfiguration('kha').buildDir;
	let config = configuration.get('launch');
	config.configurations = config.configurations.filter((value) => {
		return !value.name.startsWith('Kha: ');
	});
	config.configurations.push({
		type: 'electron',
		request: 'launch',
		name: 'Kha: HTML5',
		appDir: '${workspaceFolder}/' + buildDir + '/debug-html5',
		cwd: '${workspaceFolder}/' + buildDir + '/debug-html5',
		sourceMaps: true,
		preLaunchTask: 'Kha: Build for Debug HTML5'
	});
	config.configurations.push({
		type: 'krom',
		request: 'launch',
		name: 'Kha: Krom',
		preLaunchTask: 'Kha: Build for Krom'
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
			{ arg: 'switch', name: 'Switch', default: false }
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
			if (vscode.env.appName.includes('Kode')) {
				let exec = process.execPath;
				if (exec.indexOf('Kode Studio Helper') >= 0) {
					const dir = exec.substring(0, exec.lastIndexOf('/'));
					exec = path.join(dir, '..', '..', '..', '..', 'MacOS', 'Electron');
				}
				task = new vscode.Task(kind, `Build for ${system.name}`, 'Kha', new vscode.ProcessExecution(exec, ['--khamake', path.join(findKha(), 'make.js')].concat(args), {cwd: workspaceRoot}), ['$haxe-absolute', '$haxe']);
			}
			else {
				task = new vscode.Task(kind, vscode.TaskScope.Workspace, `Build for ${system.name}`, 'Kha', new vscode.ShellExecution('node', [path.join(findKha(), 'make.js')].concat(args)), ['$haxe-absolute', '$haxe']);
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

const KhaDebugProvider = {
	provideDebugConfigurations: (folder) => {
		let configs = [];

		folder.uri;

		const buildDir = vscode.workspace.getConfiguration('kha').buildDir;
		configs.push({
			name: 'Kha: HTML5',
			request: 'launch',
			type: 'electron',
			appDir: '${workspaceFolder}/' + buildDir + '/debug-html5',
			sourceMaps: true,
			preLaunchTask: 'Kha: Build for Debug HTML5'
		});

		return configs;
	},
	resolveDebugConfiguration: (folder, debugConfiguration) => {
		return undefined;
	}
}

let currentTarget = 'HTML5';

exports.activate = (context) => {
	channel = vscode.window.createOutputChannel('Kha');

	if (vscode.workspace.rootPath) {
		checkProject(vscode.workspace.rootPath);
	}

	let provider = vscode.workspace.registerTaskProvider('Kha', KhaTaskProvider);
	context.subscriptions.push(provider);

	// TODO: Figure out why this prevents debugging
	// let debugProvider = vscode.debug.registerDebugConfigurationProvider('electron', KhaDebugProvider);
	// context.subscriptions.push(debugProvider);

	vscode.workspace.onDidChangeWorkspaceFolders((e) => {
		for (let folder of e.added) {
			if (folder.uri.fsPath) {
				checkProject(folder.uri.fsPath);
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

	const targetItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	targetItem.text = '$(desktop-download) HTML5';
	targetItem.tooltip = 'Select Completion Target';
	targetItem.command = 'kha.selectCompletionTarget';
	targetItem.show();
	context.subscriptions.push(targetItem);

	disposable = vscode.commands.registerCommand("kha.selectCompletionTarget", () => {
		let items = ['HTML5', 'Krom', 'Kore', 'Android (Java)', 'Flash', 'HTML5-Worker', 'Java', 'Node.js', 'Unity', 'WPF'];
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
					case 'Kore':
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
		compile: compile
	};

	return api;
};

exports.deactivate = () => {

};
