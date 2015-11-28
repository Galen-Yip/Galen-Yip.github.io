var now = { row:1, col:1 }, last = { row:0, col:0};
(function(){
	const towards = { up:1, right:2, down:3, left:4};
	var isAnimating = false;
	
	var $wrap = $(".wrap");
	var data = {
		pageNum : $wrap.length,
		lockSwipeUp : 1
	};
	
	if(data.pageNum == 1){
		return false;	
	}
	
	//智能缩放
	//s=window.innerHeight/500;
	//ss=250*(1-s);
	//$('.wrap').css('-webkit-transform','scale('+s+','+s+') translate(0px,-'+ss+'px)');
	
	document.addEventListener('touchmove',function(event){
		event.preventDefault(); },false);
	
	$(document).swipeUp(function(){
		if (isAnimating) return;
		last.row = now.row;
		last.col = now.col;
		if (last.row == data.pageNum) {
			now.row = 1;
		}
		else{
			now.row = last.row+1; 
		}
		now.col = 1; 
		pageMove(towards.up);
	
		//如果滑动到最后一页，打开第一页向上的循环滑动
		if(now.row == data.pageNum){
			data.lockSwipeUp = 0;
			//console.log(1);	
		}
	})
	
	$(document).swipeDown(function(){
		if (isAnimating) return;
		last.row = now.row;
		last.col = now.col;
		//如果没打开循环
		if( data.lockSwipeUp == 1){
			if (last.row != 1) {
				now.row = last.row-1; 
				now.col = 1; 
				pageMove(towards.down);
			};
		}
		//打开向上的循环
		else{
			if (last.row == 1) {
				now.row = data.pageNum;
			}
			else{
				now.row = last.row-1; 
			}	
			now.col = 1; 
			pageMove(towards.down);
		};
		
	})
	
	function pageMove(tw){
		var lastPage = ".page-"+last.row+"-"+last.col,
			nowPage = ".page-"+now.row+"-"+now.col;
		
		switch(tw) {
			case towards.up:
				outClass = slide.outClass_up;
				inClass = slide.inClass_up;
				break;
			case towards.down:
				outClass = slide.outClass_down;
				inClass = slide.inClass_down;
				break;
		}
		isAnimating = true;
		$(nowPage).removeClass("hide");
		
		$(lastPage).addClass(outClass);
		$(nowPage).addClass(inClass);
		
		setTimeout(function(){
			$(lastPage).removeClass('page-current');
			$(lastPage).removeClass(outClass);
			$(lastPage).addClass("hide");
			//$(lastPage).find("img").addClass("hide");
			
			$(nowPage).addClass('page-current');
			$(nowPage).removeClass(inClass);
			//$(nowPage).find("img").removeClass("hide");
			
			isAnimating = false;
		},500);
	}

})();


//幻灯片
$(function(){
	//如果没幻灯片，直接不运行
	if(!$(".layer-slider")[0])return;
	const towards_slide = { up:1, right:2, down:3, left:4};
	var isAnimating = false;
	var $slider = $(".layer-slider");
	var slider_slide = {	
		outClass_up : "pt-page-moveToRight",	
		inClass_up : "pt-page-moveFromLeft",	
		outClass_down : "pt-page-moveToLeft",	
		inClass_down : "pt-page-moveFromRight"
	};
	
	$slider.each(function(index, element) {
		var now = { row:1, col:1 }, last = { row:0, col:0};
		var $sliderChild =  $(this).find("li");
		var pageNum = $sliderChild.length;
		
		$sliderChild.eq(0).removeClass("hide").addClass('page-current');
		
		//左滑事件绑定
        $(this).swipeLeft(function(e){
			//阻止冒泡
			e.stopPropagation();
			if (isAnimating) return;
			last.row = now.row;
			last.col = now.col;
			if (last.row == pageNum) {
				now.row = 1;
			}
			else{
				now.row = last.row+1; 
			}
			now.col = 1; 
			pageMove(towards_slide.left,$sliderChild,now,last);
		});
		
		//右滑事件绑定
		$(this).swipeRight(function(e){
			//阻止冒泡
			e.stopPropagation();
			
			if (isAnimating) return;
			last.row = now.row;
			last.col = now.col;

			//打开向上的循环
			if (last.row == 1) {
				now.row = pageNum;
			}
			else{
				now.row = last.row-1; 
			}	
			now.col = 1; 
			pageMove(towards_slide.right,$sliderChild,now,last);
		});
		
    });
	
	function pageMove(tw,$sliderChild,now,last){
		var $lastPage = $sliderChild.eq(last.row - 1);
			$nowPage = $sliderChild.eq(now.row - 1);
		
		switch(tw) {
			case towards_slide.right:
				outClass = slider_slide.outClass_up;
				inClass = slider_slide.inClass_up;
				break;
			case towards_slide.left:
				outClass = slider_slide.outClass_down;
				inClass = slider_slide.inClass_down;
				break;
		}
		isAnimating = true;
		$nowPage.removeClass("hide");
		
		$lastPage.addClass(outClass);
		$nowPage.addClass(inClass);
		
		setTimeout(function(){
			$lastPage.removeClass('page-current');
			$lastPage.removeClass(outClass);
			$lastPage.addClass("hide");
			//$nowPage.find("img").addClass("hide");
			
			$nowPage.addClass('page-current');
			$nowPage.removeClass(inClass);
			//$nowPage.find("img").removeClass("hide");
			
			isAnimating = false;
		},500);
	}
});