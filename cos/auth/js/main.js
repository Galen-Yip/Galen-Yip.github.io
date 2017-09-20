;(function() {
  var vue = new Vue({
    el: '.container',
    data: {
      apiType: 'json',
      appid: '',
      secretId: '',
      secretKey: '',
      bucket: '',
      hasGenerate: false,
      

      //json
      expiredTime: '',
      currentTime: '',
      randomId: '',
      filePath: '',

      fileId: '',
      original: '',
      signTmp: '',
      sign: '',


      //xml
      qSignAlgorithm: 'sha1',
      httpMethod: '',
      pathname: '',
      qSignTime: '',
      headerList: '',
      urlParamList: '',

      
      signKey: '',
      httpString: '',
      stringToSign: '',
      qSignature: '',
      authorization: '',

    },
    methods: {
      generate() {
        var checkRes = this.checkData();
        if(checkRes) {
          this.hasGenerate = false;
          alert(checkRes)
          return;
        }

        this.getAuth();

        this.hasGenerate = true;

      },
      getAuth() {
        var appid = this.appid; // 开发者的项目 ID，即COS控制台密钥管理里的 APPID
        var bucket = this.bucket; // 空间名称 Bucket
        var secretId = this.secretId; // 项目的 Secret ID
        var secretKey = this.secretKey; // 项目的 Secret Key

        if(this.apiType === 'json') {
          var expiredTime = this.expiredTime; // 单次签名，e 必须设置为0；多次有效签名时，e 为签名的时间戳，单位是秒
          var currentTime = this.currentTime; // 当前时间戳，是一个符合 Unix Epoch 时间戳规范的数值，单位为秒
          var randomId = this.randomId; // 随机串，无符号10进制整数，用户需自行生成，最长 10 位

          var filePath = this.filePath;
          var fileId = this.fileId;
          if(filePath && filePath.indexOf('/') == 0) {
            filePath = filePath.substr(filePath.indexOf('/')+1);
            fileId = encodeURIComponent(this.appid + '/' + this.bucket + '/' + filePath); // 唯一标识存储资源的相对路径。格式为 /appid/bucketname/dirname/[filename]
          }

          // 每个字段具体格式查看文档：https://www.qcloud.com/document/product/436/6054
          var original = 'a='+appid+'&k='+secretId+'&e='+expiredTime+'&t='+currentTime+'&r='+randomId+'&f='+fileId+'&b='+bucket;
          var signTmp = CryptoJS.HmacSHA1(original, secretKey);
          var sign = (signTmp.concat(CryptoJS.enc.Utf8.parse(original))).toString(CryptoJS.enc.Base64);

          this.fileId = fileId;
          this.original = original;
          this.signTmp = signTmp;
          this.sign = sign;
        }else if(this.apiType === 'xml') {
          var httpMethod = this.httpMethod;
          var pathname = this.pathname;
          var qSignAlgorithm = this.qSignAlgorithm;
          var qSignTime = this.qSignTime;
          var qKeyTime = qSignTime;
          var qHeaderList = this.getStrKeys(this.headerList);
          var qUrlParamList = this.getStrKeys(this.urlParamList);

          var signKey = CryptoJS.HmacSHA1(qKeyTime, secretKey).toString();
          var httpString = [httpMethod, pathname, this.encodeValue(qHeaderList), this.encodeValue(qUrlParamList), ''].join('\n');
          var stringToSign = [qSignAlgorithm, qSignTime, CryptoJS.SHA1(httpString).toString(), ''].join('\n');
          var qSignature = CryptoJS.HmacSHA1(stringToSign, signKey).toString();
          var authorization = [
            'q-sign-algorithm=' + qSignAlgorithm,
            'q-ak=' + secretId,
            'q-sign-time=' + qSignTime,
            'q-key-time=' + qKeyTime,
            'q-header-list=' + qHeaderList,
            'q-url-param-list=' + qUrlParamList,
            'q-signature=' + qSignature
          ].join('&');

          this.signKey = signKey;
          this.httpString = httpString.replace(/\n/g, '\\n');
          this.stringToSign = stringToSign.replace(/\n/g, '\\n');
          this.qSignature = qSignature;
          this.authorization = authorization;
        }



      },
      checkData() {
        var result;
        var arr;

        if(this.apiType === 'json') {
          arr = ['appid', 'secretId', 'secretKey', 'bucket', 'expiredTime', 'currentTime', 'randomId'];

          $.each(arr, (i, item) => {
            if(!this[item]) {
              result = '请填写 ' + item;
              return false;
            }
          })

        }else if(this.apiType === 'xml') {
          arr = ['appid', 'secretId', 'secretKey', 'bucket', 'qSignTime', 'httpMethod', 'pathname'];

          $.each(arr, (i, item) => {
            if(!this[item]) {
              result = '请填写 ' + item;
              return false;
            }
          })

          if(this['qSignTime'].indexOf(';') === -1 || this['qSignTime'].split(';')[0].length !== 10 || this['qSignTime'].split(';')[1].length !== 10) {
            result = 'qSignTime填写错误，格式为1480932292;1481012298，单位为0'
          }

          if(this['httpMethod'].match(/[A-Z]/)) {
            result = 'httpMethod应填小写'
          }

          if(this['headerList']) {
            var headerArr = this['headerList'].split('&');
            $.each(headerArr, (i, item) => {
              if(item.split('=')[0].match(/[A-Z]/)) {
                result = 'headerList的key应填小写';
                return false
              }
            })
          }
          if(this['urlParamList']) {
            var paramArr = this['urlParamList'].split('&');
            $.each(paramArr, (i, item) => {
              if(item.split('=')[0].match(/[A-Z]/)) {
                result = 'urlParamList的key应填小写';
                return false
              }
            })
          }
        }

        

        return result
      },
      getStrKeys(str) {
        var arr = str.split('&');
        var res = arr.map(item => {
          return item.split('=')[0]
        })
        return res.join(';').toLowerCase()
      },
      encodeValue(str) {
        if(!str) {
          return str
        }
        var arr = str.split('&');
        var res = arr.map((item,key) => {
          return encodeURIComponent(item.split('=')[0].toLowerCase()) + '=' + encodeURIComponent(item.split('=')[1])
        })
        return res.join('&')
      }
    },
    mounted() {
      $('[data-toggle="select"]').select2();

      $('#apiType-selector').on('change', (e) => {
        var val = $(e.target).val()
        this.apiType = val;
        this.hasGenerate = false;
      })
    }


  })
})()
