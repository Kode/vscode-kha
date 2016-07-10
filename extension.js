'use strict';

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

let channel = null;

function findKha() {
	let localkhapath = path.resolve(vscode.workspace.rootPath, 'Kha');
	if (fs.existsSync(localkhapath)) return localkhapath;
	let khapath = vscode.workspace.getConfiguration('kha').khaPath;
	if (khapath.length > 0) return khapath;
	return path.join(vscode.extensions.getExtension('ktx.kha').extensionPath, 'Kha');
}

function findFFMPEG() {
	return vscode.workspace.getConfiguration('kha').ffmpeg;
}

function compile(target) {
	let options = {
		from: vscode.workspace.rootPath,
		to: path.join(vscode.workspace.rootPath, 'build'),
		projectfile: 'khafile.js',
		target: target,
		vr: 'none',
		pch: false,
		intermediate: '',
		graphics: 'direct3d9',
		visualstudio: 'vs2015',
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
		compile: false,
		run: false,
		init: false,
		name: 'Project',
		server: false,
		port: 8080,
		debug: false,
		silent: false
	};
	try {
		require(path.join(findKha(), 'Tools/khamake/main.js'))
		.run(options, {
			info: message => {
				channel.appendLine(message);
			}, error: message => {
				channel.appendLine(message);
			}
		}, function (name) { });
	}
	catch (error) {
		channel.appendLine('Error: ' + error.toString());
	}
}

function getTargets() {
	return [
		'HTML5',
		//'HTML5 (native)',
		//'HTML5 Worker',
		'Windows',
		'Windows Universal',
		'macOS',
		'Linux',
		'Android',
		'Android (native)',
		'iOS',
		'Raspberry Pi',
		'tvOS',
		'Tizen',
		'Flash',
		'node.js',
		'Unity',
		'XNA',
		'PlayStation Mobile',
		'Java',
		'WPF'
	];
}

function mapTarget(name) {
	switch (name) {
		case 'HTML5': return 'html5';
		case 'HTML5 (native)': return 'html5-native';
		case 'HTML5 Worker': return 'html5worker';
		case 'Windows': return 'windows';
		case 'Windows Universal': return 'windowsapp';
		case 'macOS': return 'osx';
		case 'Linux': return 'linux';
		case 'Android': return 'android';
		case 'Android (native)': return 'android-native';
		case 'iOS': return 'ios';
		case 'Raspberry Pi': return 'pi';
		case 'tvOS': return 'tvos';
		case 'Tizen': return 'tizen';
		case 'Flash': return 'flash';
		case 'node.js': return 'node';
		case 'Unity': return 'unity';
		case 'XNA': return 'xna';
		case 'PlayStation Mobile': return 'psm';
		case 'Java': return 'java';
		case 'WPF': return 'wpf';
	}
}

exports.activate = function (context) {
	channel = vscode.window.createOutputChannel('Kha');

	let disposable = vscode.commands.registerCommand('kha.init', function () {
		require(path.join(findKha(), 'Tools', 'khamake', 'init.js')).run('Project', vscode.workspace.rootPath, 'khafile.js');
		vscode.commands.executeCommand('workbench.action.reloadWindow');
		vscode.window.showInformationMessage('Kha project created.');
	});

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('kha.compile', function () {
		vscode.window.showQuickPick(getTargets()).then(target => {
			channel.show();
			channel.appendLine('Compiling to ' + target);
			compile(mapTarget(target));
		});
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

exports.deactivate = function () {

};
