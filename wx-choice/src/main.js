(function($) {

    var content = $('.weui_panel_bd');

    $.ajax({
        url: 'http://115.159.107.64:2016/api.php',
        dataType: 'jsonp'
    }).done(function(res) {
        var panel;

        $.each(res.result.list, function(idx, list) {

            var panel_html = '<a href="' + list.url + '" class="weui_media_box weui_media_appmsg">' + 
                                '<div class="weui_media_hd">' +
                                    '<img class="weui_media_appmsg_thumb" src="' + list.firstImg + '" alt="">' +
                                '</div>' +
                                '<div class="weui_media_bd">' +
                                    '<h4 class="weui_media_title">' + list.title + '</h4>' +
                                    '<p class="weui_media_desc">来源：' + list.source + '</p>' +
                                '</div>' +
                             '</a>'

            content.append(panel_html)
        })
    })

    
})(Zepto)