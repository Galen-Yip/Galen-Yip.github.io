---
layout:     post
title:      "【译】使用requestIdleCallback"
subtitle:   ""
description: "requestIdleCallback是一个当浏览器处于闲置状态时，调度工作的新的性能相关的API..."
date:       2015-10-06 17:00:00
author:     "Galen"
header-img: "post-bg-05.jpg"
categories: [翻译, javascript] 
---
> 英文原文：[-> 传送门 <-](https://developers.google.com/web/updates/2015/08/27/using-requestidlecallback) （备好梯子）  
如有不当之处，还请指正。
  

###概览：
requestIdleCallback是一个当浏览器处于闲置状态时，调度工作的新的性能相关的API


  
###正文：
如今，大多数的站点和app都需要执行很多的js脚本。你的js通常需要尽可能快地执行，而且，你又不希望通过获取用户行为的方式来达成目的。如果当用户滚动页面的时候，你的JS开始上报数据，或者当用户点击按钮的时候，你往DOM中添加元素，你的web应用其实就已经变得迟钝，导致很差的用户体验。
![](http://divio.qiniudn.com/FgKRPsXKyi0PDUfrEnuVS_sQlbGT)


  现在有个好消息，一个新的API能够帮助你： `requestIdleCallback `。跟`requestAnimationFrame`一样，`requestAnimationFrame`允许我们正确地安排动画，同时最大限度地去提升到60fps。而`requestIdleCallback`则会在某一帧结束后的空闲时间或者用户处于不活跃状态时，处理我们的工作。这表明在不获取用户行为条件下，你能执行相关的工作。目前这个新的API在Chrome Canary(M46+)下可用（需要打开chrome://flags/#enable-experimental-web-platform-features 去开启该功能），这样你从今天开始先尝试玩玩。但要记着，这个API是一个实验性的功能，该规范仍在不断变化，所以任何东西都可能随时改变。
  
 
<br/>

>##为什么我要使用requestIdleCallback?

  靠自己人工的安排不必要的工作是很困难的。比如，要弄清楚一帧剩余的时间，这显然是不可能的，因为当`requestAnimationFrame`的回调完成后，还要进行样式的计算，布局，渲染以及浏览器内部的工作等等。上面的话貌似还不能说明什么。为了确保用户不以某种方式进行交互，你需要为各种交互行为添加监听事件（scroll、touch、click），即使你并不需要这些功能，只有这样才能绝对确保用户没有进行交互。另一方面，浏览器能够确切地知道在一帧的结束时有多少的可用时间，如果用户正在交互，通过使用`requestIdleCallback`这个API，允许我们尽可能高效地利用任何的空闲时间。

  接下来让我们看看它的更多细节，且让我们知道如果使用它。
  
<br/>

> ## 检查requestIdleCallback 

  目前`requestIdleCallback`这个API仍处于初期，所以在使用它之前，你应该检查它是否可用。

{% highlight javascript %}
if ('requestIdleCallback' in window) {
  // Use requestIdleCallback to schedule work.
} else {
  // Do what you’d do today.
}
{% endhighlight %}

  现在，我们假设已经支持该API

 
<br/>

>##使用requestIdleCallback

  调用requestIdleCallback跟调用requestAnimationFrame十分相似，它需要把回调函数作为第一个参数：
{% highlight javascript %}
requestIdleCallback(myNonEssentialWork);
{% endhighlight %}

  当 myNonEssentialWork 被调用，会返回一个 `deadline` 对象，这个对象包含一个方法，该方法会返回一个数字表示你的工作还能执行多长时间：

{% highlight javascript %}
function myNonEssentialWork (deadline) {
  while (deadline.timeRemaining() > 0)
    doWorkIfNeeded();
}
{% endhighlight %}

  调用 `timeRemaining` 这个方法能获得最后的剩余时间，当 timeRemaining() 返回0，如果你仍有其他任务需要执行，你便可以执行另外的requestIdleCallback：

{% highlight javascript %}
function myNonEssentialWork (deadline) {
  while (deadline.timeRemaining() > 0 && tasks.length > 0)
    doWorkIfNeeded();

  if (tasks.length > 0)
    requestIdleCallback(myNonEssentialWork);
}
{% endhighlight %}
 
<br/>

>##确保你的方法已被调用

  当事件很多的时候，你会怎么做？你可能会担心你的回调函数永远不被执行。很好，尽管requestIdleCallback跟requestAnimationFrame很像，但它们也有不同，在于requestIdleCallback有一个可选的第二个参数：含有timeout属性的对象。如果设置了timeout这个值，回调函数还没被调用的话，则浏览器必须在设置的这个毫秒数时，去强制调用对应的回调函数。

{% highlight javascript %}
// Wait at most two seconds before processing events.
requestIdleCallback(processPendingAnalyticsEvents, { timeout: 2000 });
{% endhighlight %}
  如果你的回调函数是因为设置的这个timeout而触发的，你会注意到：

* timeRemaining()会返回0
* deadline对象的didTimeout属性值是true
  
<br/>
  如果你发现didTimeout是true，你的代码可能会是这样子的：

{% highlight javascript %}
function myNonEssentialWork (deadline) {

  // Use any remaining time, or, if timed out, just run through the tasks.
  while ((deadline.timeRemaining() > 0 || deadline.didTimeout) &&
         tasks.length > 0)
    doWorkIfNeeded();

  if (tasks.length > 0)
    requestIdleCallback(myNonEssentialWork);
}
{% endhighlight %}

  因为设置timeout对你用户导致的潜在破坏（这个操作会使你的app变得迟钝且低质量），请小心地设置这个参数。所以，在这，就让浏览器自己去决定什么时候触发回调吧。

 
<br/>

>##使用requestIdleCallback去上报数据

  让我们试试用requestIdleCallback去上报数据。在这种情况下，我们可能希望去跟踪一个事件，如“点击导航栏菜单”。然而，因为通常他们是通过动画展现在屏幕上的，我们希望避免立即发送事件到Google Analytics，因此我们将创建一个事件的数组来延迟上报，且在未来的某个时间点会发送出去。

{% highlight javascript %}
var eventsToSend = [];

function onNavOpenClick () {

  // Animate the menu.
  menu.classList.add('open');

  // Store the event for later.
  eventsToSend.push(
    {
      category: 'button',
      action: 'click',
      label: 'nav',
      value: 'open'
    });

  schedulePendingEvents();
}
{% endhighlight %}
 

  现在我们使用requestIdleCallback来处理那些被挂起的事件。

{% highlight javascript %}
function schedulePendingEvents() {

  // Only schedule the rIC if one has not already been set.
  if (isRequestIdleCallbackScheduled)
    return;

  isRequestIdleCallbackScheduled = true;

  if ('requestIdleCallback' in window) {
    // Wait at most two seconds before processing events.
    requestIdleCallback(processPendingAnalyticsEvents, { timeout: 2000 });
  } else {
    processPendingAnalyticsEvents();
  }
}
{% endhighlight %}
  上面代码中，你可以看到我设置了2秒的超时，但取决于你的应用。因为对于上报的这些分析数据，设置一个timeout来确保数据在一个合理的时间范围内被上报，而不是延迟到某个未知的时间点。这样做才是合理且有意义的。

 

  最后我们来写下requestIdleCallback执行的回调方法：

{% highlight javascript %}
function processPendingAnalyticsEvents (deadline) {

  // Reset the boolean so future rICs can be set.
  isRequestIdleCallbackScheduled = false;

  // If there is no deadline, just run as long as necessary.
  // This will be the case if requestIdleCallback doesn’t exist.
  if (typeof deadline === 'undefined')
    deadline = { timeRemaining: function () { return Number.MAX_VALUE } };

  // Go for as long as there is time remaining and work to do.
  while (deadline.timeRemaining() > 0 && eventsToSend.length > 0) {
    var evt = eventsToSend.pop();

    ga('send', 'event',
        evt.category,
        evt.action,
        evt.label,
        evt.value);
  }

  // Check if there are more events still to send.
  if (eventsToSend.length > 0)
    schedulePendingEvents();
}
{% endhighlight %}
  这个例子中，我假设如果不支持requestIdleCallback，则立即上报数据。然而，对于一个在生产环境的应用，最好是用timeout延迟上报来确保不跟任何相互冲突。

 

 
<br/>

>##使用requestIdleCallback改变dom

  requestIdleCallback可以帮助提高性能的另一个场景是，当你需要做一些非必要的dom改动，比如懒加载，滚动页面时候不断在尾部添加元素。让我们看看requestIdleCallback事实上是如何插入一帧里的。

![](http://divio.qiniudn.com/FtNOYG0e9lfz-LQm0WEYKGAuXOnV)


  对于浏览器，在给定的一帧内因为太忙而没有去执行任何回调这是有可能的，所以你不应该期望在一帧的末尾有空闲的时间去做任何事。这一点就使得requestIdleCallback跟setImmediate不太像，setImmediate是在每一帧里都会执行。

  如果在某一帧的末尾，回调函数被触发，它将被安排在当前帧被commit之后，这表示相应的样式已经改动，同时更最重要的，布局已经重新计算。如果我们在这个回调中进行样式的改动，涉及到的布局计算则会被判无效。如果在下一帧中有任何的读取布局相关的操作，例如getBoundingClientRect，clientWidth等等，浏览器会不得不执行一次强制同步布局（[Forced Synchronous Layout](https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing#avoid-forced-synchronous-layouts)），这将是一个潜在的性能瓶颈。

  另一个不要在回调中触发Dom改动的原因是，Dom改动是不可预期的，正因为如此，我们可以很容易地超过浏览器给出的时间限期。

  最佳的实践就是只在requestAnimationFrame的回调中去进行dom的改动，因为浏览器会优化同类型的改动。这表明我们的代码要在requestIdleCallback时使用文档片段，这样就能在下一个requestAnimationFrame回调中把所有改动的dom追加上去。如果你正在使用Virtual DOM这个库，你可以使用requestIdleCallback进行Dom变动，但真正的Dom改动还是在下一个requestAnimationFrame的回调中，而不是requestIdleCallback的回调中。

  所以谨记上面说的，下面来看下代码吧：

{% highlight javascript %}
function processPendingElements (deadline) {

  // If there is no deadline, just run as long as necessary.
  if (typeof deadline === 'undefined')
    deadline = { timeRemaining: function () { return Number.MAX_VALUE } };

  if (!documentFragment)
    documentFragment = document.createDocumentFragment();

  // Go for as long as there is time remaining and work to do.
  while (deadline.timeRemaining() > 0 && elementsToAdd.length > 0) {

    // Create the element.
    var elToAdd = elementsToAdd.pop();
    var el = document.createElement(elToAdd.tag);
    el.textContent = elToAdd.content;

    // Add it to the fragment.
    documentFragment.appendChild(el);

    // Don't append to the document immediately, wait for the next
    // requestAnimationFrame callback.
    scheduleVisualUpdateIfNeeded();
  }

  // Check if there are more events still to send.
  if (elementsToAdd.length > 0)
    scheduleElementCreation();
}
{% endhighlight %}
 

  在上面，我创建了一个元素，而且使用添加上了textContent这个属性。但这时候还不应该把元素追加到文档流中去。创建完元素添加到文档片段后，scheduleVisualUpdateIfNeeded则被调用，它会创建一个requestAnimationFrame的回调，这时候，我们就应该把文档片段追加到body中去了：

{% highlight javascript %}
function scheduleVisualUpdateIfNeeded() {

  if (isVisualUpdateScheduled)
    return;

  isVisualUpdateScheduled = true;

  requestAnimationFrame(appendDocumentFragment);
}

function appendDocumentFragment() {
  // Append the fragment and reset.
  document.body.appendChild(documentFragment);
  documentFragment = null;
}
{% endhighlight %}
  一切顺利的话，我们则会看到追加dom到文档中时，并没有什么性能的损耗。真tm的棒！



