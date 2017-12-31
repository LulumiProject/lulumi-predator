var term,
    protocol,
    socketURL,
    socket,
    pid;

var terminalContainer = document.getElementById('terminal-container');

function setTerminalSize() {
  var cols = 86;
  var rows = 26;
  var viewportElement = document.querySelector('.xterm-viewport');
  var scrollBarWidth = viewportElement.offsetWidth - viewportElement.clientWidth;
  var width = (cols * term.charMeasure.width + 20 /*room for scrollbar*/).toString() + 'px';
  var height = (rows * term.charMeasure.height).toString() + 'px';

  terminalContainer.style.width = width;
  terminalContainer.style.height = height;
  term.resize(cols, rows);
}

function createTerminal() {
  // Clean terminal
  while (terminalContainer.children.length) {
    terminalContainer.removeChild(terminalContainer.children[0]);
  }
  term = new Terminal({
    cursorBlink: true,
    scrollback: 1000,
    tabStopWidth: 8,
  });
  term.on('resize', function (size) {
    if (!pid) {
      return;
    }
    var cols = size.cols,
        rows = size.rows,
        url = '/terminals/' + pid + '/size?cols=' + cols + '&rows=' + rows;

    fetch(url, {method: 'POST'});
  });
  protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
  socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + '/terminals/';

  term.open(terminalContainer);
  term.fit();

  // fit is called within a setTimeout, cols and rows need this.
  setTimeout(function () {
    // Set terminal size again to set the specific dimensions on the demo
    setTerminalSize();

    fetch('/terminals?cols=' + term.cols + '&rows=' + term.rows, {method: 'POST'}).then(function (res) {

      res.text().then(function (pid) {
        window.pid = pid;
        socketURL += pid;
        socket = new WebSocket(socketURL);
        socket.onopen = runRealTerminal;
        socket.onclose = runFakeTerminal;
        socket.onerror = runFakeTerminal;
      });
    });
  }, 0);
}

function runRealTerminal() {
  term.attach(socket);
  term._initialized = true;
}

function runFakeTerminal() {
  if (term._initialized) {
    return;
  }

  term._initialized = true;

  var shellprompt = '$ ';

  term.prompt = function () {
    term.write('\r\n' + shellprompt);
  };

  term.writeln('Welcome to xterm.js');
  term.writeln('This is a local terminal emulation, without a real terminal in the back-end.');
  term.writeln('Type some keys and commands to play around.');
  term.writeln('');
  term.prompt();

  term.on('key', function (key, ev) {
    var printable = (
      !ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey
    );

    if (ev.keyCode == 13) {
      term.prompt();
    } else if (ev.keyCode == 8) {
    // Do not delete the prompt
      if (term.x > 2) {
        term.write('\b \b');
      }
    } else if (printable) {
      term.write(key);
    }
  });

  term.on('paste', function (data, ev) {
    term.write(data);
  });
}

createTerminal();
