---
layout:     post
title:      "浅显易懂的Redux深究"
subtitle:   ""
description: "半个多月redux的学习，分析下redux，当做记录吧"
date:       2016-02-06 00:01:30
author:     "Galen"
header-img: "post-bg-06.jpg"
categories: [react] 
---  

半个多月redux的学习，分析下redux，当做记录吧

> 题外话，有看到前些天转的很火的[@徐叔叔的回答](https://www.zhihu.com/question/39943474/answer/83905933)。说下就自己的看法吧，这也是为什么有这篇redux研究文章的原因。考虑适用性，团队效率等等都是十分赞同的，但就个人而言，自己纯属是为了满足个人的好奇心，为了在这大浪淘沙的前端变革时代，能身为一个历经者。仅此而已。

> [github项目地址](https://github.com/Galen-Yip/react-redux-router)

### 核心：

* 只使用一个store将整个应用程序的状态state用object tree的方式存储。原生的flux会有许多分散的store存储各自不同的状态，但在redux中，只有一个store。

{% highlight javascript %}
//原生 Flux 的 store
var firstStore = {
    first: 1
}
var secondStore = {
    second: 2
}

// Redux 的單一 store
var state = {
    firstState: {
        first: 1
    },
    secondState: {
        second: 2
    }
}
{% endhighlight %}

* 单向数据流，统一入口，改变state只能发送action，action就是一个东西，告诉state该怎么改变而已。这个特性跟原生的flux是一样的。

* 接受action，更改state的叫做Reducer。Reducer包含两个参数，旧的state和action，返回新的state

### Actions
在redux和flux中，actions都是一个告知state要变更的东西
形如：

{% highlight javascript %}
{
  type: ADD_TODO,
  payload: {
    text: 'Build my first Redux app'
  }
}
{% endhighlight %}


### Actions Creators
在flux中，action creator要做dispatch的动作
redux中，action creator只是简单的回传action

flux中：

{% highlight javascript %}
function addTodoWithDispatch(text) {
    dispatch({
        type: ADD_TODO,
        payload: {
            text
        }
    });
}
// 实际发送 action
addTodoWithDispatch(text)
{% endhighlight %}

redux中：

{% highlight javascript %}
function addTodo(text) {
    return {
        type: ADD_TODO,
        payload: {
            text
        }
    };
}

// 实际发送 action
dispatch(addTodo(text));
dispatch(removeTodo(id));
{% endhighlight %}

在redux中，dispatch()方法来源于store.dispatch()
但react-redux中提供了connnector元件，这个元件会把dispatch提取出来给我们使用，所以不需要我们从store中提取

redux中提供了bindActionCreators()，就是将ActionCreator外加上了一层dispatch()，因为都想偷懒不写dispatch(removeTodo(id))这些绑定代码

> 所以bindActionCreator()是常用的方法之一

### Reducers

Reducers类似于flux里面的Store，但在Redux中，它是挡在Store前的一个东西，Redux里只有一个Store，所以这些Reduers的功能就是针对这个唯一的Store内的State的部分内容进行更新 Reduer接收2个参数，旧的State和action，返回新的State
例子：

{% highlight javascript %}
const initialState = { todos: [], idCounter: 0 };

function todos(state = initialState, action) {
    switch (action.type) {
        case ADD_TODO:
            return {
                ...state,
                todos: [
                    ...state.todos,
                    { text: action.payload, id: state.idCounter + 1 }
                ],
                idCounter: state.idCounter + 1
            };
        case REMOVE_TODO:
            return {
                ...state,
                todos: state.todos.filter(todo => todo.id !== action.payload)
            };
        default:
            return state;
    }
}
{% endhighlight %}

…state就是展开操作符，这里这么用的作用是返回新的对象，不修改原来的对象

### Store
Redux中只有一个Store，这个Store是基于许多的Reduers上的
Redux提供了createStore()方法

如果是只有单个Reducer时：

{% highlight javascript %}
import { createStore } from 'redux';
import todos from '../reducers/todos';
const store = createStore(todos);
{% endhighlight %}

多个Reducer时，则用combineReducers()把多个reducers合并成一个再丢给createStore()

{% highlight javascript %} 
export function todos(state, action) {
  /* ... */
}

export function counter(state, action) {
  /* ... */
}

import { createStore, combineReducers } from 'redux';
import * as reducers from '../reducers';
const reducer = combineReducers(reducers);
const store = createStore(reducer);
{% endhighlight %}

得出的Store是这样的：

{% highlight javascript %}
{
    dispatch,
    subscribe,
    getState,
    getReducer,
    replaceReducer
};
{% endhighlight %}

调用getState()，可以得到state

{% highlight javascript %}
const state = store.getState();
console.log(state);

// 結果：
{
    todos: todoState,
    counter: counterState
}
{% endhighlight %}

### 元件Container
官方使用的是container pattern，即有一个只管接收props并render的“笨”元件，和一个包括在笨元件外面的负责管理和传递数据的container元件
container元件也就负责与Redux交流

react-redux提供了 Provider元件和connect方法

### Provider
用在应用的根元素外面，负责传递唯一的Store给应用

{% highlight javascript %}
const reducer = combineReducers(reducers);
const store = createStore(reducer);

class App extends Component {
    render() {
        return (
            <Provider store={store}>
                {() => <App />}
            </Provider>
        );
    }
}
{% endhighlight %}

### connect
用法：`connect(select)(Component)`
connect接收一个函数当参数并传回一个Component Class

作用：将dispatch方法透过props的方式加到元件中，而且还能选取这个container需要state的哪一部分
例如下面，只选取state里的counter部分

{% highlight javascript %}
function select(state) {
  return { counter: state.counter };
}

class CounterApp {
    render() {
        const { counter, dispatch } = this.props;
        return (
            <Counter counter={counter} />
        );
    }
}

export default connect(select)(CounterApp)
{% endhighlight %}

当然，也可以不加select方法，这样Connector收到的就是整个应用程序完整的

下面是很好的完整的redux的demo:

{% highlight javascript %}
import React from 'react';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';

// React component
class Counter extends React.Component {
  render(){
    const { value, onIncreaseClick } = this.props;
    return (
      <div>
        <span>{value}</span>
        <button onClick={onIncreaseClick}>Increase</button>
      </div>
    );
  }
}

// Action:
const increaseAction = {type: 'increase'};

// Reducer:
function counter(state={count: 0}, action) {
  let count = state.count;
  switch(action.type){
    case 'increase':
      return {count: count+1};
    default:
      return state;
  }
}

// Store:
let store = createStore(counter);

// Map Redux state to component props
function mapStateToProps(state)  {
  return {
    value: state.count
  };
}

// Map Redux actions to component props
function mapDispatchToProps(dispatch) {
  return {
    onIncreaseClick: () => dispatch(increaseAction)
  };
}

// Connected Component:
let App = connect(
  mapStateToProps,
  mapDispatchToProps
)(Counter);

React.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);
{% endhighlight %}

### 自己理解的结构图
![http://7xnand.com1.z0.glb.clouddn.com/redux-construction.png](http://7xnand.com1.z0.glb.clouddn.com/redux-construction.png)

### 中间件

redux本身能很好的处理同步的情况，但异步的情况在web开发中必不可少。
我把同步和异步分开来说

#### 同步：
![http://7xnand.com1.z0.glb.clouddn.com/redux-middleware-sync.png](http://7xnand.com1.z0.glb.clouddn.com/redux-middleware-sync.png)

通过redux暴露出的applyMiddlewares，我们可以得到一个新的dispatch.
所以applyMiddlewares的实际效果可以看做是：`dispatch => newdispatch`

#### 异步：
![http://7xnand.com1.z0.glb.clouddn.com/redux-middleware-async.png](http://7xnand.com1.z0.glb.clouddn.com/redux-middleware-async.png)

对于异步的情况，我们拿redux-thunk为例，它会对传入的action进行判断，如果是function的话。则去把我们的action执行，这个执行的就是我们的delay代码。然后在最里面执行dispatch()。所以我们的箭头又重新回到最上面，这一次就相当于同步的使用了


# 实践中
下面是实际开发中使用到的

### 项目目录
{% highlight javascript %}
|-- actions
|-- components
|-- constants
|-- containers
|-- index.jsx
|-- main.css
|-- middleware
|-- reducers
|-- routes
|-- store
{% endhighlight %}

- components 是没有关于actions和stores的依赖，拿出项目也可以单独使用

项目中会用到的工具类（中间件）：

- redux-thunk

使得dispatch给store时是异步的，比如action中需要ajax

- redux-logger

记录状态改变前和后

- immutable

不可变数据，即对于复杂结构的对象，如果需要改变某一层某个值，不像过去进行一次深拷贝那样浪费资源，而是只改变该层以上的一些引用，其他没变的仍然指针指向原来的地址

在后期性能优化中，对于嵌套组件而言，希望没改变的不重新渲染。直接对比this.state和previous.state是否全等则可以，因为如果有修改，则最顶层的引用是修改了的

- react-immutable-render-mixin

用ES7 decorator的方式引入
用于跳过更新没有改变state的子组件
代替了 pure-render-mixim的功能

- redux-devtools

3.0.1现在的版本是，改变比较大，参考他的github
如果是babel6+
有些地方需要加上 .default


### 下面是开发中遇到的几个注意点：

一、
注意这里的items和filter，这些就是state！！！
{% highlight javascript %}
export default combineReducers({
    items,
    filter
})
{% endhighlight %}

二、
用了es6，则mixant的用法不可用，用HOC(高阶组件)替代

关于HOC和mixing、decorator
[www.jianshu.com]('http://www.jianshu.com/p/4780d82e874a')


> 文章有点流水了，其中如有不当的还请指出，或者大家交流交流~~~

