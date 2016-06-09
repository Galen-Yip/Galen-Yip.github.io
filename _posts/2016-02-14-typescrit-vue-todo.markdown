---
layout:     post
title:      "Todo App with Vue.js and Typescript"
subtitle:   ""
description: "基于typescript和vue做的Todo App示例"
date:       2016-06-09 00:17:00
author:     "Galen"
header-img: "post-bg-11.jpg"
categories: [typescript,vue,webpack] 
---  

> github地址：[传送门](https://github.com/Galen-Yip/Typescript_Vue_Todo)

## Overview

there is a Todo sample on typescript offical website using Backbone.js.

Features:  

* typescipt  

* vue.js  

* webpack  

* Use of external typings from DefinitelyTyped  

* Vscode

## Running  

{% highlight javascript %}

> npm install -g typescript  
> npm install  
> npm link typescript  
> npm start

{% endhighlight %}

## 记几个要点

* 一、typings

现在不推荐用tsd来安装定义文件，推荐使用typings，且从DefinityTyped下载
指令从1.0版本前的
{% highlight javascript %}
typings install vue --ambient --save
{% endhighlight %}
变成
{% highlight javascript %}
typings install dt~vue --global --save
{% endhighlight %}

`dt~`前缀表示从DefinityTyped下载文件


* 二、addTask

添加任务的时候，注意是调用的`@keyup.enter="addTask()"`，如果用`@keyup.enter="addTask"`的话，里面的this指向了dom元素





