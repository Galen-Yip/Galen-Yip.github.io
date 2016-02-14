---
layout:     post
title:      "Redux服务端渲染及webpack优化"
subtitle:   ""
description: "基于上一篇文章中的应用,对这个应用进行优化，包括构建时webpack慢等进行优化"
date:       2016-02-14 00:23:50
author:     "Galen"
header-img: "post-bg-10.jpg"
categories: [react,webpack] 
---  

> 明天就要上班了 T T

### 前言

在上一篇文章中对redux的基本用法以及一些原理的性的东西进行了分析

还没看的童鞋可以看这里 

- [上一篇文章传送门](http://galen-yip.com/react/2016/02/06/go-into-redux/)
- [github项目传送门](https://github.com/Galen-Yip/react-redux-router)
- [在线demo](http://45.78.33.77:3000)

这一篇主要是webpack、redux、react-router和server rendering的应用，主要面向有了一定redux基础和webpack基础的，当做学习记录，如有不当，望不吝赐教

### 客户端渲染VS服务端渲染

现如今的SPA，backbone、ember、vue、angular、react这些包括各家的前端轮子都biubiubiu冒出来，带来的好处真的太多，以前由server控制的转移到客户端。页面渲染、路由跳转、数据拉取等等等等JS完全控制了，也大大提高了用户体验，这里讲的客户端渲染，基本上就是客户端ajax拉取数据，然后渲染，之后js操控全部的逻辑。但是这也就主要造成了两个问题：

1、SEO问题，爬虫抓不到内容。目前这个也是有五花八门的解决方案。

2、客户端初始化渲染比服务端页面直出还是慢，需要等js加载完之后才能渲染。

因此为了解决上面两个问题，我们就有了*服务端渲染*

### 服务端渲染

作用：用于用户首次请求，便于SEO，加快页面显示

原理：

- server跟client共享一部分代码

- server拿到首次渲染需要的数据initialState

- server根据initialState把html render出来

- server把html和initialState发往客户端

其实服务端渲染以前就有了，只是react的出现让这个重新被提起，因为react能让它实现起来更优雅

### 终于要进入redux要点了

- 服务端

- 客户端

#### 服务端

那结合上一篇文章中的应用，redux在服务端应该如何使用呢？
按照上面服务端渲染的流程：

- 取得store
- 获取initialState
- 用renderToString渲染html
- 把html和initialState注入到模板中，initialState用script的方式写在window对象下，客户端就可以用window.__initial_state__取得
- 发送注入模板后的字符串到客户端

新建一个server.js在根目录，服务端用express做服务
代码形如下：

{% highlight javascript %}
import path from 'path';
import express from 'express';
import compression from 'compression';

import React from 'react';
import { renderToString } from 'react-dom/server';
import { match, RoutingContext } from 'react-router';
import { createStore, applyMiddleware, compose } from 'redux';
import { Provider } from 'react-redux';
import createLocation from 'history/lib/createLocation';
import createMemoryHistory from 'history/lib/createMemoryHistory';

import rootReducer from './app/reducers';
import middleware from './app/middleware';
import createRoutes from './app/routes/routes';

const app = express();
const port = process.env.PORT || 3000;

app.set('views', path.join(__dirname, 'views'));

app.use(compression());
app.use(bodyParser.json());
app.use('/build', express.static(path.join(__dirname, 'build')));  //设置build文件夹为存放静态文件的目录
app.use(handleRender);

function handleRender(req, res) {

    const history = createMemoryHistory();
    const routes = createRoutes(history)
    const location = createLocation(req.url);

    // req.url is the full url
    match({ routes, location }, (err, redirectLocation, renderProps) => {
        if(err) {
            return res.status(500).send(err.message)
        }

        if(!renderProps) {
            return res.status(404).send('not found')
        }

        const store = compose(
            applyMiddleware.apply(this, middleware)
        )(createStore)(rootReducer)

        // render the component to string
        const initialView = renderToString(
            <div>
                <Provider store={store}>
                    { <RoutingContext {...renderProps} /> }
                </Provider>
            </div>
        )

        const initialState = store.getState();

        res.status(200).send(renderFullPage(initialView, initialState))
    })

}

function renderFullPage(html, initialState) {
     const assets = require('./stats.json');

     return `
         <!DOCTYPE html>
             <!--[if lt IE 7 ]> <html lang="en" class="ie6" > <![endif]-->
             <!--[if IE 7 ]>    <html lang="en" class="ie7" > <![endif]-->
             <!--[if IE 8 ]>    <html lang="en" class="ie8" > <![endif]-->
             <!--[if IE 9 ]>    <html lang="en" class="ie9" > <![endif]-->
             <!--[if (gt IE 9)|!(IE)]><!--> <html lang="en" class="" > <!--<![endif]-->
             <head>
               <meta charset="utf-8">
               <title>react-redux-router</title>
               <link href="./build/${assets.assetsByChunkName.app[1]}" rel="stylesheet">
              
             </head>
             <body>

             <div id="app">${html}</div>
             <script>
                window.__INITIAL_STATE__ = ${JSON.stringify(initialState)}
             </script>
             <script src="http://cdn.bootcss.com/react/0.14.7/react.min.js"></script>
             <script src="http://cdn.bootcss.com/react/0.14.7/react-dom.min.js"></script>
             <script src="./build/${assets.assetsByChunkName.vendors}"></script>

             <script src="./build/${assets.assetsByChunkName.app[0]}"></script>

             </body>
         </html>
         `
}

app.listen(port, () => {
    console.log('this server is running on ' + port)
});
{% endhighlight %}

在实践中遇到以下几个有点坑爹的问题：

1、写一个server.js，用了es6的语法，要运行的话需要用babel-node( node —harmony 不支持import ) 。但一直执行babel-node都提示没有presets。最后发现是全局的babel是5.x.x版本，需要升级。因为babel6进行了拆分，先卸载了babel，然后安装babel-cli。然后在package.son加了一条：

{% highlight javascript %}
scripts: {
     "server": "nodemon server.js --exec babel-node",
     ...
}
{% endhighlight %}

2、服务端的react-router和客户端的用法完全不同，看了它的github主页才知道[地址](https://github.com/reactjs/react-router/blob/master/docs/guides/ServerRendering.md)
用到了`match`和`RouterContext`这两个api

3、服务端用了express。然后发现怎么都加载不进静态资源，然后想起要加入
`app.use(express.static(path.join(__dirname, 'build')));`

重新执行命令，发现能够加载静态文件了。但是发现服务端渲染的内容不对，渲染的内容跟客户端渲染的一样。然后发现是我的build目录下有生成的Index.html文件，express默认去加载了那个文件，而没有用吐出的内容。找到原因就好做了，在app.use中加入第一个参数路径即可`app.use('/build', express.static(path.join(__dirname, 'build')));`

4、`this.props.items.toArray is not a function`的报错，原因定位是靠`window.__INITIAL_STATE__`获取的state是原始的js对象，因为项目用了immutableJs，需要转换成immutable对象。
直接`Immutable.fromJS(window.__INITIAL_STATE__)`发现还是不行，redux只接受键值跟原本一样的。于是要改成这样：

{% highlight javascript %}
if(initialState) {
    Object.keys(initialState).forEach(key => {
        initialState[key] = fromJS(initialState[key])
    })
}
{% endhighlight %}

顶级的不变，只把值变成immutable data

5、`Warning: React attempted to reuse markup in a container but the checksum was invalid. This generally means that you are using server rendering and the markup generated on the server was not what the client was expecting. React injected new markup to compensate which works but you have lost many of the benefits of server rendering. Instead, figure out why the markup being generated is different on the client or server:
 (client) "><a class="" href="#Home" data-reactid=
 (server) "><a class="" href="Home" data-reactid="`
如上的错误提示，是服务端渲染出来的跟客户端预期渲染的不一样，最后定位是客户端用的是 'history/lib/createHashHistory'导致的，换成'history/lib/createBrowserHistory'问题解决

> 换成createBrowserHistory后，在浏览器直接打开index.html会报
`Failed to execute 'replaceState' on 'History'`
看来是谷歌新版的安全策略


6、控制台中打印的`Download the React DevTools for a better development experience: https://fb.me/react-devtools`
如果需要去掉，则在webpack.config.js中加入

{% highlight javascript %}
plugins: [
  new webpack.DefinePlugin({
      'process.env': {
          NODE_ENV: '"production"'
      }
  })
]
{% endhighlight %}
  
<br>

#### 客户端

客户端的改动并不大，在createStore前，获取window.__INITIAL_STATE__作为initialState。其他不用做改动

{% highlight javascript %}
const initialState = window.__INITIAL_STATE__;
if(initialState) {
    Object.keys(initialState).forEach(key => {
        initialState[key] = fromJS(initialState[key])
    })
}
const store = configureStore(initialState);
{% endhighlight %}

以上大体就是redux在服务端渲染的应用，但目前还没有对于api请求这一点，之后会再慢慢完善

### webpack的优化

babel5到6之后，用es6写东西，webpack打包起来慢啊，webpack真的可以说是前端的带薪编译......
我们只能尽量去优化一些了

1、用alias别名

{% highlight javascript %}
alias: {
  'react': path.resolve(PATHS.node_modules, 'react/dist/react.js'),
  'react-dom': path.resolve(PATHS.node_modules, 'react-dom/dist/react-dom.js'),
  'react-redux': path.resolve(PATHS.node_modules, 'react-redux/dist/react-redux.js'),
  'react-router': path.resolve(PATHS.node_modules, 'react-router/lib/index.js'),
  'redux': path.resolve(PATHS.node_modules, 'redux/dist/redux.js')
}
{% endhighlight %}

直接指明路径，免去硬盘搜索的时间浪费。其实这里本应该指向压缩后的文件，但是在`additional chunk assets`这一步会卡到20多秒，去google了下，发现是说`UglifyJSPlugin`接受压缩的文件会让webpack执行得十分慢。所以alias这里没引用压缩后的文件


2、不打包react和react-dom，而是全局引用

去掉alias中的react和react-dom

{% highlight javascript %}
resolve: {
    alias: {
    //     'react': path.resolve(PATHS.node_modules, 'react/dist/react.js'),
    //     'react-dom': path.resolve(PATHS.node_modules, 'react-dom/dist/react-dom.js'),
        'react-redux': path.resolve(PATHS.node_modules, 'react-redux/dist/react-redux.js'),
        'react-router': path.resolve(PATHS.node_modules, 'react-router/lib/index.js'),
        'redux': path.resolve(PATHS.node_modules, 'redux/dist/redux.js')
    }
}
{% endhighlight %}

webpack配置文件中加上

{% highlight javascript %}
externals: {
  'react': 'React',
  'react-dom': 'ReactDOM'
}
{% endhighlight %}

然后去node_modules/html-webpack-template/index.html中加上react和react-dom的CDN引用（服务端渲染的也要记得加上）

vendors由原来的376KB变成了247KB.

3、提取css

用`ExtractTextPlugin`这个插件，至于怎么使用，可以看github项目文件了

4、清理build文件夹

用`CleanPlugin`，每次build的时候，清理一下build文件夹

> 服务端改进了下，加了compress，用了ejs的模板引擎，这个项目会慢慢地去完善它，再次祭出地址 [github传送门](https://github.com/Galen-Yip/react-redux-router)




