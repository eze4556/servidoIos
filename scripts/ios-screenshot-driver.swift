#if targetEnvironment(simulator)
final class ScreenshotBridgeViewController: CAPBridgeViewController {
    private var captureTimer: Timer?
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        let setup = "localStorage.setItem('servido:tutorial-seen:v1:home','1');"
        config.userContentController.addUserScript(WKUserScript(source: setup, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        return config
    }
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard captureTimer == nil else { return }
        captureTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in self?.inspectCapture() }
    }
    private func inspectCapture() {
        let route = ProcessInfo.processInfo.environment["SERVIDO_SCREENSHOT_ROUTE"] ?? "/"
        let data = try! JSONSerialization.data(withJSONObject: [route])
        let routeJSON = String(data: data, encoding: .utf8)!
        let js = #"""
        (() => {
          const target = \#(routeJSON)[0];
          const clean = p => p.replace(/\/+$/, '') || '/';
          const actual = clean(location.pathname);
          const wanted = clean(target);
          const state = window.__servidoCapture || (window.__servidoCapture = {started: Date.now(), clicked: false, arrived: 0});
          const dialog = document.querySelector('[role="dialog"][data-state="open"]');
          if(dialog) {
            const close = Array.from(dialog.querySelectorAll('button')).find(b=>b.textContent.trim()==='Entendido');
            if(close) close.click();
          }
          if(actual !== wanted && !state.clicked && Date.now()-state.started > 15000) {
            const link = Array.from(document.querySelectorAll('a[href]')).find(a=>clean(new URL(a.href,location.href).pathname)===wanted);
            if(link) { state.clicked=true; link.click(); }
          }
          if(actual === wanted && !state.arrived) state.arrived=Date.now();
          const text = document.body?.innerText || '';
          const expected = {'/products':'Productos','/services':'Servicios','/restaurantes':'Restaurantes','/':'Servido'}[wanted];
          const ready = actual===wanted && text.includes(expected) && text.length>250 && Date.now()-state.arrived>45000 && !dialog;
          return JSON.stringify({ready, route:actual, wanted, bodyLength:text.length, clicked:state.clicked, links:document.querySelectorAll('a[href]').length});
        })()
        """#
        webView?.evaluateJavaScript(js) { value, error in
            guard let result = value as? String, let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
            try? result.write(to: folder.appendingPathComponent("capture-state.json"), atomically: true, encoding: .utf8)
        }
    }
}
#endif
