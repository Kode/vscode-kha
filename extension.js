'use strict';

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

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

exports.activate = function (context) {
	let disposable = vscode.commands.registerCommand('kha.init', function () {
		require(path.join(findKha(), 'Tools', 'khamake', 'init.js')).run('Project', vscode.workspace.rootPath, 'khafile.js');
		vscode.commands.executeCommand('workbench.action.reloadWindow');
		vscode.window.showInformationMessage('Kha project created.');
	});

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('kha.compile', function () {
		const fs = require('fs');
		fs.stat(path.resolve(vscode.workspace.rootPath, 'Kha'), (err, stats) => {
			let options = {
				from: vscode.workspace.rootPath,
				to: path.join(vscode.workspace.rootPath, 'build'),
				projectfile: 'khafile.js',
				target: 'debug-html5',
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
							console.log(message);
						}, error: message => {
							console.error(message);
						}
					}, function (name) { });
			}
			catch (error) {
				console.error('Error: ' + error.toString());
			}
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
		findFFMPEG: findFFMPEG
	};

	return api;
};

exports.deactivate = function () {

};
