---
layout:     post
title:      "mongo游标导致的栈溢出报错"
subtitle:   ""
description: "在mongo中每天的数据量大概是5500W+，每天一张collection。大数据量面前，直接把数据load到内存里的话，不用说，直接死翘翘了..."
date:       2015-11-02 01:30:00
author:     "Galen"
header-img: "post-bg-05.jpg"
categories: [nodejs] 
---  

### 背景：

在mongo中每天的数据量大概是5500W+，每天一张collection。
大数据量面前，直接把数据load到内存里的话，不用说，直接死翘翘了。这里采用了游标的方式。
每天早上7点开始每5分钟跑一次脚本。用游标的方式遍历数据，数据量到7点为止，差不多是700+W。

node定时器：[-传送门-](http://www.cnblogs.com/cocowool/archive/2009/04/22/1441291.html)
  
<br>

### 主要代码结构：

![主要代码结构]({{ site.cdnurl }}/mongo-error1.png)
  
<br>

###解决过程：

晚上写好定时脚本，第二天去看nohup的日志，发现7点15分，即在只执行了几次之后就报错了。

用游标，大概跑了2次700+W的数据之后，在第三次定时跑的时候显示 内存溢出。
去谷歌了下，发现目测是循环引用导致

![主要代码结构]({{ site.cdnurl }}/mongo-error2.png)



1、尝试在每一次跑完之后，人为的去回收函数变量以及对象，比如cursor，每次processoMaps、processGraph调用完回收item。试试
![主要代码结构]({{ site.cdnurl }}/mongo-error3.png)
  
错误代码变了点，重新分析了下，看来问题还是出现在游标的调用上。


2、再google了下，发现这个错误除了栈内存爆了，也有可能是nodejs的异步调用池溢出了。根据内存分析，也确实，栈内存溢出的可能性比较低。于是在递归调用cursor的地方，外面加上了setImmediate。卧槽，跑下来，没问题了。

后来也在这里找到了问同样问题的：[http://stackoverflow.com/...](http://stackoverflow.com/a/18119789/5485774)
          
<br> 

### 拓展：
既然说到了setImmediate，我们就来看看***直接调用、setImmediate、process.nextTick、setTimeout***这四个有什么差别呢？


#### * 直接调用

我们跑一下下面的demo:
{% highlight javascript %}
function forNext(i,end){
     if(i>end){
          console.log('program is end!');
     }else{
          console.log('调用递归中......i='+i);
          return forNext(i+1,end);
     }
}

forNext(0,100000);
{% endhighlight %}

![主要代码结构]({{ site.cdnurl }}/mongo-error4.png)

这时候报错了。
而且执行多几遍，发现报错时候 i 对应的数值还会不相同

很显然，这正是文章最前面我们调用cursor.nextObject()报错的原因。

<br>

#### * process.nextTick、setImmediate、setTimeout

首先要了解什么是nodejs的event loop。这个就不解释了，看链接：[传送门](https://nodesource.com/blog/understanding-the-nodejs-event-loop)

简单说：event loop是主线程执行栈的行为，每次event loop，我们称为Tick。当执行栈为空的时候，去任务队列取里面的任务

在nodejs0.9版本之前，递归调用用的都是process.nextTick，之后推荐使用setImmediate


> 这是官网文档说明：  
Note: the nextTick queue is completely drained on each pass of the event loop beforeadditional I/O is processed. As a result, recursively setting nextTick callbacks will block any I/O from happening, just like a while(true); loop.

所以，process.nextTick算是恶劣的插队行为，直接插在当前执行栈的末尾、io回调之前。如果递归使用它，会造成回调不断延后，造成event loop 饥饿。  
而setImmediate是插在下一次event loop的时候，发生在io回调之后，不会影响io回调


我们执行下这个demo:
{% highlight javascript %}
setImmediate(function() {
     console.log(5)
})

process.nextTick(function() {
     console.log(2)
})

process.nextTick(function() {
     console.log(3)
})
{% endhighlight %}
执行结果是：
![主要代码结构]({{ site.cdnurl }}/mongo-error5.png)


可以看出，跟书写的顺序确实是没有关系的。


process.nextTick的回调放在一个数组中，在下一次Tick之前，nextTick回调数组里面的全部一次性执行。
setImmediate的回调是放在一个链表中的，每一次Tick，只执行链表中的一个回调。


在event loop中，process.nextTick属于idle观察者，setImmediate属于check观察者。  
idle观察者优先于io观察者，io观察者优先于check观察者

这篇回答貘大从源码层面深挖了原理：[2]


那setTimeout呢？
我们来执行以下的代码来对比一下：
{% highlight javascript %}
setImmediate(function() {
     console.log(1)
})

setTimeout(function() {
     console.log(2)
}, 0)

setTimeout(function() {
     console.log(4)
}, 0)

setImmediate(function() {
     console.log(3)
})
{% endhighlight %}

![主要代码结构]({{ site.cdnurl }}/mongo-error6.png)

因为setImmediate不会导致event loop被block住，允许其他的I/O或者timer的callback执行，所以setTimeout的执行会穿插在setImmediate中

<br>

### 总结：
* process.nextTick插入在当前执行栈的尾部，io回调之前，setImmediate插入在下一次的event loop中，io回调之后
* process.nextTick的回调放在数组中，一次性全部执行。setImmediate则放在链表中。nextTick全部执行完才会执行setImmediate的回调
* process.nextTick会造成event loop饥饿
* 递归回调均用setImmediate


<br>

### 参考：<br>
>
[1] [http://stackoverflow.com/...](http://stackoverflow.com/a/28161894/5485774)  
[2] [http://www.zhihu.com/...](http://www.zhihu.com/question/23028843/answer/34594257)  
[3] [https://nodejs.org/api/...](https://nodejs.org/api/process.html#process_process_nexttick_callback_arg)




