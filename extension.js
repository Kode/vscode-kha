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
	if (khapath.length > 0) return path.resolve(khapath);
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
		to: path.join(vscode.workspace.rootPath, 'build'),
		projectfile: 'khafile.js',
		target: target,
		vr: 'none',
		pch: false,
		intermediate: '',
		graphics: 'direct3d11',
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
		watch: false
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
	KhaDisplayArgumentsProvider.update('--cwd ' + path.join(rootPath, 'build') + '\n' + hxml);
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
	vshaxe.registerDisplayArgumentsProvider('Kha', KhaDisplayArgumentsProvider);
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
	let config = configuration.get('launch');
	config.configurations = config.configurations.filter((value) => {
		return !value.name.startsWith('Kha: ');
	});
	config.configurations.push({
		type: 'electron',
		request: 'launch',
		name: 'Kha: HTML5',
		appDir: '${workspaceFolder}/build/debug-html5',
		sourceMaps: true,
		preLaunchTask: 'Kha: Build for Debug HTML5'
	});
	config.configurations.push({
		type: 'krom',
		request: 'launch',
		name: 'Kha: Krom',
		appDir: '${workspaceFolder}/build/krom',
		resourcesDir: '${workspaceFolder}/build/krom-resources',
		sourceMaps: true,
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
			{ arg: 'windowsapp', name: 'Windows Universal', default: false },
			{ arg: 'osx', name: 'macOS', default: false },
			{ arg: 'linux', name: 'Linux', default: false },
			{ arg: 'android', name: 'Android', default: false },
			{ arg: 'android-native', name: 'Android (native)', default: false },
			{ arg: 'ios', name: 'iOS', default: false },
			{ arg: 'pi', name: 'Raspberry Pi', default: false },
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
			if (findFFMPEG() > 0) {
				args.push('--ffmpeg');
				args.push(findFFMPEG());
			}
			let kind = {
				type: 'Kha',
				target: system.name,
			}
			let task = new vscode.Task(kind, `Build for ${system.name}`, 'Kha', new vscode.ShellExecution('node ' + path.join(findKha(), 'make.js') + ' ' + args.join(' ')), '$haxe');
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

		configs.push({
			name: 'Kha: HTML5',
			request: 'launch',
			type: 'electron',
			appDir: '${workspaceFolder}/build/debug-html5',
			sourceMaps: true,
			preLaunchTask: 'Kha: Build for Debug HTML5'
		});

		return configs;
	},
	resolveDebugConfiguration: (folder, debugConfiguration) => {
		return undefined;
	}
}

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

	disposable = vscode.commands.registerCommand('kha.findKha', function () {
		return findKha();
	});

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('kha.findFFMPEG', function () {
		return findFFMPEG();
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
