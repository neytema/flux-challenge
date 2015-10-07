/* globals document, XMLHttpRequest, WebSocket */
var app = {
  push: push,
  dispatch: dispatcher(),
  handle: handle,
  states: []
};

boot();

function boot() {
  var i, l, last, options;
  var view_ = view(document.body);
  var slots = view_.cssSlot;
  var planet = planetState();
  var scroll = scrollState();
  var states = app.states;

  states.push(planet, scroll);

  for (i = 0, l = slots.length; i < l; i++) {
    options = last ? { prev: last } : { id: 3616 };
    options.node = slots[i];
    last = sithState(options);
    states.push(last);
    sithView(last);
  }

  planetView(planet, view_.cssPlanetMonitor);
  scrollView(scroll, {
    up: view_.cssButtonUp,
    down: view_.cssButtonDown
  });

  app.push({});

  ws('ws://localhost:4000', function (message) {
    app.push({ planet: message });
  });

  // var request = httpget('http://localhost:3000/dark-jedis/3616', function (error, result) {
  //   console.log(error, result);
  // });
}

function scrollState() {
  var state = {
    _listen: _listen
  };

  return state;

  function _listen() {
  }
}


function planetState() {
  var state = {
    _listen: _listen,
    id: null,
    name: null
  };

  return state;

  function _listen(payload) {
    var planet = payload.planet;

    if (planet) {
      state.id = planet.id;
      state.name = planet.name;
    }
  }
}

function sithState(options) {
  var prev = options.prev || null;
  var state = {
    _listen: _listen,
    id: options.id || null,
    name: null,
    homeworld: null,
    master: null,
    apprentice: null,
    prev: prev,
    next: null,
    node: options.node
  };

  if (prev) {
    prev.next = state;
  }

  return state;

  function _listen(payload) {
    var sith = payload.sith;

    if (sith && sith.id === state.id) {
      state.name = sith.name;
      state.homeworld = sith.homeworld;
      state.master = sith.master || null;
      state.apprentice = sith.apprentice || null;
    }

    if (state.prev) {
      if (state.prev.apprentice) {
        state.id = state.prev.apprentice.id;
      } else {
        state.id = null;
      }
    }

    if (state.next) {
      if (state.next.master) {
        state.id = state.next.master.id;
      } else {
        state.id = null;
      }
    }
  }
}

function scrollView() {
}

function planetView(state, node) {
  on(state, 'update', update);

  function update() {
    if (state.name) {
      node.innerText = 'Obi-Wan currently on '+ state.name;
    } else {
      node.innerText = '';
    }
  }
}

function sithView(state) {
  var request;

  on(state, 'update', update);

  function update(changes) {
    if ('id' in changes) {
      if (state.id) {
        load();
      } else {
        abort();
      }
    }

    if ('name' in changes) {
      render();
    }
  }

  function render() {
    if (state.name) {
      state.node.innerHTML = '<h3>'+ state.name +'</h3><h6>Homeworld: '+ state.homeworld.name +'</h6>';
    } else {
      state.node.innerHTML = '';
    }
  }

  function load() {
    abort();
    request = xhr('http://localhost:3000/dark-jedis/'+ state.id, response);
  }

  function response(error, result) {
    if ( ! error) {
      app.push({ sith: result });
    }
  }

  function abort() {
    if (request) {
      request.abort();
      request = null;
    }
  }
}

function view(element) {
  var i, l, key, item;
  var nodes = element.getElementsByTagName('*');
  var rex = /-(\w)/g;
  var result = {};

  for (i = 0, l = nodes.length; i < l; i++) {
    item = nodes[i];
    key = item.classList[0];

    if (key) {
      key = key.replace(rex, upper);

      if ( ! result[key]) {
        result[key] = item;
      } else if (result[key].nodeType) {
        result[key] = [ result[key], item ];
      } else {
        result[key].push(item);
      }
    }
  }

  return result;

  function upper(_, c) {
    return c.toUpperCase();
  }
}

function xhr(url, callback) {
  var request = new XMLHttpRequest();
  request.open('get', url, true);
  request.onload = onload;
  request.onerror = onerror;
  request.onabort = onerror;
  request.send(null);
  return request;

  function onload() {
    finish(null, JSON.parse(request.responseText));
  }

  function onerror(event) {
    finish(event);
  }

  function finish(error, result) {
    request.onload = null;
    request.onerror = null;
    request.onabort = null;
    request = null;
    callback(error, result);
  }
}

function ws(url, messageCallback) {
  new WebSocket(url).onmessage = onmessage;

  function onmessage(event) {
    messageCallback(JSON.parse(event.data));
  }
}

function on(object, type, listener) {
  var events = object._events;

  if ( ! events) {
    events = {};
    object._events = events;
  }

  if ( ! events[type]) {
    events[type] = [ listener ];
  } else {
    events[type].push(listener);
  }
}

function emit(object, type, args) {
  var i, l;
  var events = object._events;

  if (events) {
    events = events[type];
  }

  if (events) {
    args = args || [];

    for (i = 0, l = events.length; i < l; i++) {
      events[i].apply(null, args);
    }
  }
}

function semit(state, type, args) {
  var _emit = state._emit;

  if ( ! _emit) {
    _emit = [];
    state._emit = _emit;
  }

  _emit.push([ type, args ]);
}

function handle(payload, wait) {
  var i, state, prev, changes, _emit, key, args;
  var states = app.states;

  wait(states);

  for (i = states.length; i--;) {
    state = states[i];
    prev = state._previous;

    if ( ! prev) {
      prev = {};
      state._previous = prev;
    }

    for (key in state) if (key[0] !== '_' && prev[key] !== state[key]) {
      changes = changes || {};
      prev[key] = state[key];
      changes[key] = state[key];
    }

    if (changes) {
      semit(state, 'update', [ changes ]);
      changes = null;
    }

    _emit = state._emit;

    if (_emit && _emit.length) {
      for (;args = _emit.shift();) {
        emit(state, args[0], args[1]);
      }
    }
  }
}

function push() {
  var i, l, a;
  for (a = arguments, i = 0, l = a.length; i < l; i++) {
    this.dispatch(a[i], this.handle);
  }
}


function dispatcher(limit) {
    var _done = 0;
    var _queue = [];
    var _execute = true;
    var _max = Number.MAX_SAFE_INTEGER;
    var _limit = limit || 1000;

    return dispatch_;

    function dispatch_(payload, list) {
        var limit;
        var item = [ payload, list ];

        _queue.push(item);

        if (_execute) {
            _execute = false;
            limit = _limit + _queue.length;

            while (_queue.length) {
                if ( ! --limit) {
                    throw new Error('payload queue length limit reached');
                }

                item = _queue.shift();
                _process(item[0], item[1]);
            }

            _execute = true;
        }
    }

    function _process(payload, list) {
        var done = _done++ % _max;
        var execute = true;
        var stack = [];

        (function waitFor(list) {
            var i, l, func;

            if (arguments.length > 1) {
                list = arguments;
            } else if (Array.isArray(list)) {
                list = list.slice();
            } else {
                list = [ list ];
            }

            if (execute) {
                for (i = 0, l = list.length; i < l; i++) {
                    func = list[i]._listen || list[i];

                    if (typeof func !== 'function') {
                        throw new TypeError('listener must be function');
                    }

                    if (func._done_ !== done) {
                        if (func._exec_) {
                            execute = false;
                            func(payload, waitFor);
                            execute = true;
                        } else {
                            func._exec_ = true;
                            func(payload, waitFor);
                            func._exec_ = false;

                            stack.push(list[i]);
                        }

                        func._done_ = done;
                    }
                }
            }

            return stack;
        })(list);
    }
}
