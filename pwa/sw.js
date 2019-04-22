// importScripts("https://storage.googleapis.com/workbox-cdn/releases/3.1.0/workbox-sw.js");
var staticCacheKey = 'static-pwa-1'
var apiCacheKey = 'api-pwa-1'
var testCacheKey = 'test-cache-key'

var cacheList = [
  '/',
  'index.html',
  'index.css',
  '/imgs/boy.png',
  '/manifest.json'
]

let urlsToPrefetch = ['index.css']
var testCacheList = ['/manifest.json']

// 安装service woker
self.addEventListener('install', e => {
  console.log('install 被触发了！')
  e.waitUntil( // 
    caches.open(staticCacheKey)  // 打开 cache Storage 里面key 为 staticCacheKey 的缓存对象，如果没有则以staticCacheKey创建缓存对象
      .then(cache => cache.addAll(cacheList))  // 缓存 cacheList 里面对应的资源链接
      .then(() => self.skipWaiting())  // 新的service woker 安装后需要用户重新打开页面才能完成安装，此方法的调用就是可以实现立即跳出等待 
  )
  // 添加 测试 cache
  e.waitUntil(
    caches.open(testCacheKey)
      .then(cache => cache.addAll(testCacheList))
      .then(() => self.skipWaiting())
  )
  
  // 修改本地文件
  e.waitUntil(
    caches.open(staticCacheKey).then(function(cache) {
      var cachePromises = urlsToPrefetch.map(function(urlToPrefetch) {
      // 使用 url 对象进行路由拼接
        var url = new URL(urlToPrefetch, location.href)
        // url.search += (url.search ? '&' : '?') + 'cache=' + Date.now();
        // 创建 request 对象进行流量的获取
        var request = new Request(url, {mode: 'no-cors'})
        // 手动发送请求，用来进行文件的更新
        return fetch(request).then(function(response) {
          if (response.status >= 400) {
            // 解决请求失败时的情况
            throw new Error('request for ' + urlToPrefetch +
              ' failed with status ' + response.statusText)
          }
          // 将成功后的 response 流，存放在 caches 套件中，完成指定文件的更新。
          console.log('更新缓存成功！')
          return cache.put(urlToPrefetch, response)
        }).catch(function(error) {
          console.error('Not caching ' + urlToPrefetch + ' due to ' + error)
        })
      })

      return Promise.all(cachePromises).then(function() {
        console.log('Pre-fetching complete.')
      })

    }).catch(function(error) {
      console.error('Pre-fetching failed:', error)
    })
  )
})


// 缓存捕获
self.addEventListener('fetch', function (e) {
  e.respondWith(  // 包裹捕获请求的代码
    caches.match(e.request) // 捕获 fetch 的reauest流 在缓存空间中查找指定路径的缓存文件
      .then(function (response) {
        if (response) { // 如果找到 直接返回缓存
          console.log(e.request, 'fetch-----我是缓存！')
          return response
        }
        // 没有找到 则整车发送fetch
        // 因为e.request 流已经在cache.match中使用过一次 那么该流是不能再次使用的 我们只能 复制他的副本 拿着使用

        let fetchRequest = e.request.clone()
        return fetch(fetchRequest).then(
          function(response) {
            if (!response || response.status !== 200) {
              console.log(fetchRequest, 'fetch-----重新拉取失败')
              return response
            }

            // 如果成功 该response 一是要拿给浏览渲染 惹事要进行缓存
            // 不过需要记住 由于caches.put 使用的是文件的响应流 一旦使用
            // 那么返回 response 就无法访问赵成失败 所以 这里需要复制一份

            let responseToCache = response.clone()

            caches.open(apiCacheKey)
              .then(function(cache) {
                cache.put(e.request, responseToCache)
              });
              console.log('featch-----第一次拉取接口成功 进行缓存')
              return response
          }
        )  
      })
  )
})

// 在active周期里做一些清除
self.addEventListener('activate', function(e) {
  console.log('active被触发了')
  e.waitUntil(
    // 清理旧版本
    caches.keys().then(cacheNames => {
      console.log('清理旧版本资源')
      return Promise.all(
        cacheNames.filter(cacheName => {
          // return cacheName === ''
          return cacheName === 'test-cache-key'
        }).map(cacheName => {
          return caches.delete(cacheName)
        })
      ).then(() => {
        console.log('我是新安装的sw，我要掌握页面')
        return self.clients.claim() // 新安装的sw 通过self.cliens.claim() 取得页面的控制权，这样之后打开页面都会使用版本更新的缓存 旧的sw脚本不在控制页面，就是会进入到redundant期
      })
    })
  )
})


// 使用 message 来更新根目录下的html文件
self.addEventListener('message',event =>{
  console.log("receive message" + event.data)
  // 通常sw不会更新根目录下的 html文件  如果需要可以使用一下方法
  let url = event.data;
  console.log("update root file :  ", url)
  event.waitUntil(
    caches.open(staticCacheKey).then(cache=>{
        return fetch(url)
          .then(res=>{
            cache.put(url, res)
          })
    })
  )
})

