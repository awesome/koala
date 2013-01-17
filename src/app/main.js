//主界面

'use strict'; 

//share main context
var gui = require('nw.gui'); 
global.gui = gui;
global.mainWindow = gui.Window.get();
global.jQuery = jQuery;
global.debug = function(messge) {
	global.mainWindow.window.console.log(messge);
};

//require lib
var path = require('path'),
	jade = require('jade'),
	fs = require('fs'),
	common = require('./app/common.js'),
	storage = require('./app/storage.js'),
	jadeManager =  require('./app/jadeManager.js'),
	fileWatcher = require('./app/fileWatcher.js'),
	projectManager = require('./app/projectManager.js'),
	notifier = require('./app/notifier.js');

//===========程序初始化=============
//catch error
process.on('uncaughtException', function(e) {
	notifier.throwAppError(e.stack);
});

//渲染主界面
(function renderPage() {
	projectManager.checkStatus();//检查项目的有效性

	var projects = storage.getProjects(),
		projectsList = [],
		activeProjectFiles = [];

	//遍历数据
	//项目列表
	for(var k in projects){
		projectsList.push(projects[k]);
	}

	if(projectsList.length > 0){
		var activeProject = projectsList[0];
		activeProject.active = true;

		//文件列表
		for(k in activeProject.files){
			activeProjectFiles.push(activeProject.files[k])
		}
	}

	//渲染数据
	var foldersHtml = jadeManager.renderFolders(projectsList),
		filesHtml = jadeManager.renderFiles(activeProjectFiles);

	$('#folders').html(foldersHtml);
	$('#files ul').html(filesHtml);

	global.mainWindow.show();//显示主界面
}());

//start watch file changes
(function startWatcher() {
	//获取文件列表
	var projectsDb = storage.getProjects(),
		compileFiles = [];

	for(var k in projectsDb){
		var filsItem = projectsDb[k].files,
			pid = filsItem.id;
		for(var j in filsItem){
			compileFiles.push({
				pid: pid,
				src: filsItem[j].src
			});
		}
	}

	if(compileFiles.length > 0) {
		//监视文件改动
		fileWatcher.add(compileFiles);
	}
}());


//=============绑定DOM事件================
//添加项目
$('#addDirectory').bind('click', function(){
	$('#ipt_addProject').trigger('click');
});
$('#ipt_addProject').bind('change', function(){
	var direPath = $(this).val();
	
	projectManager.addProject(direPath, function(item) {
		var foldersHtml = jadeManager.renderFolders([item]);
		$('#folders').append(foldersHtml);
		$('#folders li:last').trigger('click');
	});

	$(this).val('')
});

//浏览项目文件
$('#folders li').live('click', function(){
	var self = $(this),
		id = self.data('id');

	var projects = storage.getProjects(),
		files = projects[id].files,
		fileList = [],
		html = '';

	for(var k in files) {
		fileList.push(files[k])
	}

	if(fileList.length > 0) {
		html = jadeManager.renderFiles(files);
	}

	$('#files ul').html(html);
	$('#folders .active').removeClass('active');
	self.addClass('active');
});

//删除项目
$('#deleteDirectory').bind('click', function(){
	var activeProjectElem = $('#folders').find('.active');

	if (!activeProjectElem[0]) {
		return false;
	}

	var id = activeProjectElem.data('id');

	projectManager.deleteProject(id, function(){
		//显示下一个项目
		var nextItem;
		if(activeProjectElem.next().length > 0){
			nextItem = activeProjectElem.next()
		}
		if(activeProjectElem.prev().length > 0){
			nextItem = activeProjectElem.prev()
		}

		if(nextItem){
			nextItem.trigger('click');
		}else{
			$('#files ul').html('');
		}

		//删除自身
		activeProjectElem.remove();
	});
});

//改变输出目录
$('#ipt_fileOutput').change(function() {
	var output = $(this).val(),
		outputType = path.extname(output),
		data = JSON.parse($('#ipt_fileData').val());
	if (output.length === 0 || data.output === output) {
		return false;
	}
	var suffixs = {
		'less': '.css',
		'sass': '.css',
		'scss': '.css',
		'coffee': '.js'
	};
	if (outputType !== suffixs[data.type]) {
		notifier.alert('please select a ' + suffixs[data.type] + ' file');
		return false;
	}

	//提交更新
	data.output = output;
	var pid = $('#folders').find('.active').data('id');
	projectManager.updateFile(pid, data, function() {
		console.log(data);
		$('#' + data.id).find('.output span').text(output);
	});
});
$('.changeOutput').live('click', function() {
	var self = $(this).closest('li');
	var data = {
		id: self.attr('id'),
		type: self.data('type'),
		src: self.find('.src').text(),
		name: self.find('.name').text(),
		output: self.find('.output span').text(),
		settings: self.data('settings') || {}
	};

	$('#ipt_fileData').val(JSON.stringify(data));
	$('#ipt_fileOutput').trigger('click');
});

//用户设置
$('#settings').click(function() {
	var option = {
		position: 'center',
		width: 800,
		height: 600,
		show: false,
		toolbar: false
	};

	gui.Window.open('settings.html', option);
});

//更新目录
$('#refresh').click(function() {
	var id = $('#folders .active').data('id'),
		html;

	if (!id) return false;

	projectManager.refreshProject(id, function(files) {
		html = jadeManager.renderFiles(files);
		$('#files ul').html(html);
	});
});

//取消编译
$('.settings .compile').live('change', function(){
	var fileItem = $(this).closest('li'),
		fileSrc = fileItem.data('src');

	console.log(this.checked)
});