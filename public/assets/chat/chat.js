var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

(function($, window) {
  var Base, Io, Log, Timeout, ZammadChat, myScript, scriptHost, scripts;
  scripts = document.getElementsByTagName('script');
  myScript = scripts[scripts.length - 1];
  scriptHost = myScript.src.match('.*://([^:/]*).*')[1];
  Base = (function() {
    Base.prototype.defaults = {
      debug: false
    };

    function Base(options) {
      this.options = $.extend({}, this.defaults, options);
      this.log = new Log({
        debug: this.options.debug,
        logPrefix: this.options.logPrefix || this.logPrefix
      });
    }

    return Base;

  })();
  Log = (function() {
    Log.prototype.defaults = {
      debug: false
    };

    function Log(options) {
      this.log = bind(this.log, this);
      this.error = bind(this.error, this);
      this.notice = bind(this.notice, this);
      this.debug = bind(this.debug, this);
      this.options = $.extend({}, this.defaults, options);
    }

    Log.prototype.debug = function() {
      var items;
      items = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      if (!this.options.debug) {
        return;
      }
      return this.log('debug', items);
    };

    Log.prototype.notice = function() {
      var items;
      items = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return this.log('notice', items);
    };

    Log.prototype.error = function() {
      var items;
      items = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return this.log('error', items);
    };

    Log.prototype.log = function(level, items) {
      var i, item, len, logString;
      items.unshift('||');
      items.unshift(level);
      items.unshift(this.options.logPrefix);
      console.log.apply(console, items);
      if (!this.options.debug) {
        return;
      }
      logString = '';
      for (i = 0, len = items.length; i < len; i++) {
        item = items[i];
        logString += ' ';
        if (typeof item === 'object') {
          logString += JSON.stringify(item);
        } else if (item && item.toString) {
          logString += item.toString();
        } else {
          logString += item;
        }
      }
      return $('.js-chatLogDisplay').prepend('<div>' + logString + '</div>');
    };

    return Log;

  })();
  Timeout = (function(superClass) {
    extend(Timeout, superClass);

    Timeout.prototype.timeoutStartedAt = null;

    Timeout.prototype.logPrefix = 'timeout';

    Timeout.prototype.defaults = {
      debug: false,
      timeout: 4,
      timeoutIntervallCheck: 0.5
    };

    function Timeout(options) {
      this.stop = bind(this.stop, this);
      this.start = bind(this.start, this);
      Timeout.__super__.constructor.call(this, options);
    }

    Timeout.prototype.start = function() {
      var check, timeoutStartedAt;
      this.stop();
      timeoutStartedAt = new Date;
      check = (function(_this) {
        return function() {
          var timeLeft;
          timeLeft = new Date - new Date(timeoutStartedAt.getTime() + _this.options.timeout * 1000 * 60);
          _this.log.debug("Timeout check for " + _this.options.timeout + " minutes (left " + (timeLeft / 1000) + " sec.)");
          if (timeLeft < 0) {
            return;
          }
          _this.stop();
          return _this.options.callback();
        };
      })(this);
      this.log.debug("Start timeout in " + this.options.timeout + " minutes");
      return this.intervallId = setInterval(check, this.options.timeoutIntervallCheck * 1000 * 60);
    };

    Timeout.prototype.stop = function() {
      if (!this.intervallId) {
        return;
      }
      this.log.debug("Stop timeout of " + this.options.timeout + " minutes at");
      return clearInterval(this.intervallId);
    };

    return Timeout;

  })(Base);
  Io = (function(superClass) {
    extend(Io, superClass);

    Io.prototype.logPrefix = 'io';

    function Io(options) {
      this.send = bind(this.send, this);
      this.reconnect = bind(this.reconnect, this);
      this.close = bind(this.close, this);
      this.connect = bind(this.connect, this);
      this.set = bind(this.set, this);
      Io.__super__.constructor.call(this, options);
    }

    Io.prototype.set = function(params) {
      var key, results, value;
      results = [];
      for (key in params) {
        value = params[key];
        results.push(this.options[key] = value);
      }
      return results;
    };

    Io.prototype.connect = function() {
      this.log.debug("Connecting to " + this.options.host);
      this.ws = new window.WebSocket("" + this.options.host);
      this.ws.onopen = (function(_this) {
        return function(e) {
          _this.log.debug('on open', e);
          return _this.options.onOpen(e);
        };
      })(this);
      this.ws.onmessage = (function(_this) {
        return function(e) {
          var pipes;
          pipes = JSON.parse(e.data);
          _this.log.debug('on message', e.data);
          if (_this.options.onMessage) {
            return _this.options.onMessage(pipes);
          }
        };
      })(this);
      this.ws.onclose = (function(_this) {
        return function(e) {
          _this.log.debug('close websocket connection');
          if (_this.options.onClose) {
            return _this.options.onClose(e);
          }
        };
      })(this);
      return this.ws.onerror = (function(_this) {
        return function(e) {
          _this.log.debug('onerror', e);
          if (_this.options.onError) {
            return _this.options.onError(e);
          }
        };
      })(this);
    };

    Io.prototype.close = function() {
      return this.ws.close();
    };

    Io.prototype.reconnect = function() {
      this.ws.close();
      return this.connect();
    };

    Io.prototype.send = function(event, data) {
      var msg;
      if (data == null) {
        data = {};
      }
      this.log.debug('send', event, data);
      msg = JSON.stringify({
        event: event,
        data: data
      });
      return this.ws.send(msg);
    };

    return Io;

  })(Base);
  ZammadChat = (function(superClass) {
    extend(ZammadChat, superClass);

    ZammadChat.prototype.defaults = {
      chatId: void 0,
      show: true,
      target: $('body'),
      host: '',
      debug: false,
      flat: false,
      lang: void 0,
      cssAutoload: true,
      cssUrl: void 0,
      fontSize: void 0,
      buttonClass: 'open-zammad-chat',
      inactiveClass: 'is-inactive',
      title: '<strong>Chat</strong> with us!',
      idleTimeout: 8,
      idleTimeoutIntervallCheck: 0.5,
      inactiveTimeout: 8,
      inactiveTimeoutIntervallCheck: 0.5,
      waitingListTimeout: 4,
      waitingListTimeoutIntervallCheck: 0.5
    };

    ZammadChat.prototype.logPrefix = 'chat';

    ZammadChat.prototype._messageCount = 0;

    ZammadChat.prototype.isOpen = true;

    ZammadChat.prototype.blinkOnlineInterval = null;

    ZammadChat.prototype.stopBlinOnlineStateTimeout = null;

    ZammadChat.prototype.showTimeEveryXMinutes = 1;

    ZammadChat.prototype.lastTimestamp = null;

    ZammadChat.prototype.lastAddedType = null;

    ZammadChat.prototype.inputTimeout = null;

    ZammadChat.prototype.isTyping = false;

    ZammadChat.prototype.state = 'offline';

    ZammadChat.prototype.initialQueueDelay = 10000;

    ZammadChat.prototype.translations = {
      de: {
        '<strong>Chat</strong> with us!': '<strong>Chat</strong> mit uns!',
        'Online': 'Online',
        'Online': 'Online',
        'Offline': 'Offline',
        'Connecting': 'Verbinden',
        'Connection re-established': 'Verbindung wiederhergestellt',
        'Today': 'Heute',
        'Send': 'Senden',
        'Compose your message...': 'Ihre Nachricht...',
        'All colleges are busy.': 'Alle Kollegen sind belegt.',
        'You are on waiting list position <strong>%s</strong>.': 'Sie sind in der Warteliste an der Position <strong>%s</strong>.',
        'Start new conversation': 'Neue Konversation starten',
        'Since you didn\'t respond in the last %s minutes your conversation with <strong>%s</strong> got closed.': 'Da Sie in den letzten %s Minuten nichts geschrieben haben wurde Ihre Konversation mit <strong>%s</strong> geschlossen.',
        'Since you didn\'t respond in the last %s minutes your conversation got closed.': 'Da Sie in den letzten %s Minuten nichts geschrieben haben wurde Ihre Konversation geschlossen.'
      }
    };

    ZammadChat.prototype.sessionId = void 0;

    ZammadChat.prototype.T = function() {
      var i, item, items, len, string, translations;
      string = arguments[0], items = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      if (this.options.lang && this.options.lang !== 'en') {
        if (!this.translations[this.options.lang]) {
          this.log.notice("Translation '" + this.options.lang + "' needed!");
        } else {
          translations = this.translations[this.options.lang];
          if (!translations[string]) {
            this.log.notice("Translation needed for '" + string + "'");
          }
          string = translations[string] || string;
        }
      }
      if (items) {
        for (i = 0, len = items.length; i < len; i++) {
          item = items[i];
          string = string.replace(/%s/, item);
        }
      }
      return string;
    };

    ZammadChat.prototype.view = function(name) {
      return (function(_this) {
        return function(options) {
          if (!options) {
            options = {};
          }
          options.T = _this.T;
          options.background = _this.options.background;
          options.flat = _this.options.flat;
          options.fontSize = _this.options.fontSize;
          return window.zammadChatTemplates[name](options);
        };
      })(this);
    };

    function ZammadChat(options) {
      this.startTimeoutObservers = bind(this.startTimeoutObservers, this);
      this.setAgentOnlineState = bind(this.setAgentOnlineState, this);
      this.onConnectionEstablished = bind(this.onConnectionEstablished, this);
      this.setSessionId = bind(this.setSessionId, this);
      this.onConnectionReestablished = bind(this.onConnectionReestablished, this);
      this.reconnect = bind(this.reconnect, this);
      this.wsReconnectStop = bind(this.wsReconnectStop, this);
      this.wsReconnectStart = bind(this.wsReconnectStart, this);
      this.destroy = bind(this.destroy, this);
      this.onLeaveTemporary = bind(this.onLeaveTemporary, this);
      this.onAgentTypingEnd = bind(this.onAgentTypingEnd, this);
      this.onAgentTypingStart = bind(this.onAgentTypingStart, this);
      this.onQueue = bind(this.onQueue, this);
      this.onQueueScreen = bind(this.onQueueScreen, this);
      this.onCloseAnimationEnd = bind(this.onCloseAnimationEnd, this);
      this.closeWindow = bind(this.closeWindow, this);
      this.close = bind(this.close, this);
      this.onOpenAnimationEnd = bind(this.onOpenAnimationEnd, this);
      this.open = bind(this.open, this);
      this.renderMessage = bind(this.renderMessage, this);
      this.receiveMessage = bind(this.receiveMessage, this);
      this.onSubmit = bind(this.onSubmit, this);
      this.onInput = bind(this.onInput, this);
      this.reopenSession = bind(this.reopenSession, this);
      this.onError = bind(this.onError, this);
      this.onReady = bind(this.onReady, this);
      this.onWebSocketMessage = bind(this.onWebSocketMessage, this);
      this.send = bind(this.send, this);
      this.checkForEnter = bind(this.checkForEnter, this);
      this.render = bind(this.render, this);
      this.view = bind(this.view, this);
      this.T = bind(this.T, this);
      this.options = $.extend({}, this.defaults, options);
      ZammadChat.__super__.constructor.call(this, this.options);
      if (!$) {
        this.state = 'unsupported';
        this.log.notice('Chat: no jquery found!');
        return;
      }
      if (!window.WebSocket || !sessionStorage) {
        this.state = 'unsupported';
        this.log.notice('Chat: Browser not supported!');
        return;
      }
      if (!this.options.chatId) {
        this.state = 'unsupported';
        this.log.error('Chat: need chatId as option!');
        return;
      }
      if (!this.options.lang) {
        this.options.lang = $('html').attr('lang');
      }
      if (this.options.lang) {
        this.options.lang = this.options.lang.replace(/-.+?$/, '');
        this.log.debug("lang: " + this.options.lang);
      }
      if (!this.options.host) {
        this.detectHost();
      }
      this.loadCss();
      this.io = new Io(this.options);
      this.io.set({
        onOpen: this.render,
        onClose: this.hide,
        onMessage: this.onWebSocketMessage
      });
      this.io.connect();
    }

    ZammadChat.prototype.render = function() {
      this.el = $(this.view('chat')({
        title: this.options.title
      }));
      this.options.target.append(this.el);
      this.input = this.el.find('.zammad-chat-input');
      $("." + this.options.buttonClass).addClass(this.inactiveClass);
      this.el.find('.js-chat-open').click(this.open);
      this.el.find('.js-chat-close').click(this.close);
      this.el.find('.zammad-chat-controls').on('submit', this.onSubmit);
      this.input.on({
        keydown: this.checkForEnter,
        input: this.onInput
      });
      $(window).on('beforeunload', (function(_this) {
        return function() {
          return _this.onLeaveTemporary();
        };
      })(this));
      this.setAgentOnlineState('online');
      this.log.debug('widget rendered');
      this.startTimeoutObservers();
      this.idleTimeout.start();
      this.sessionId = sessionStorage.getItem('sessionId');
      return this.send('chat_status_customer', {
        session_id: this.sessionId
      });
    };

    ZammadChat.prototype.checkForEnter = function(event) {
      if (!event.shiftKey && event.keyCode === 13) {
        event.preventDefault();
        return this.sendMessage();
      }
    };

    ZammadChat.prototype.send = function(event, data) {
      if (data == null) {
        data = {};
      }
      data.chat_id = this.options.chatId;
      return this.io.send(event, data);
    };

    ZammadChat.prototype.onWebSocketMessage = function(pipes) {
      var i, len, pipe;
      for (i = 0, len = pipes.length; i < len; i++) {
        pipe = pipes[i];
        this.log.debug('ws:onmessage', pipe);
        switch (pipe.event) {
          case 'chat_error':
            this.log.notice(pipe.data);
            if (pipe.data && pipe.data.state === 'chat_disabled') {
              this.destroy({
                hide: true
              });
            }
            break;
          case 'chat_session_message':
            if (pipe.data.self_written) {
              return;
            }
            this.receiveMessage(pipe.data);
            break;
          case 'chat_session_typing':
            if (pipe.data.self_written) {
              return;
            }
            this.onAgentTypingStart();
            break;
          case 'chat_session_start':
            this.onConnectionEstablished(pipe.data);
            break;
          case 'chat_session_queue':
            this.onQueueScreen(pipe.data);
            break;
          case 'chat_session_closed':
            this.onSessionClosed(pipe.data);
            break;
          case 'chat_session_left':
            this.onSessionClosed(pipe.data);
            break;
          case 'chat_status_customer':
            switch (pipe.data.state) {
              case 'online':
                this.sessionId = void 0;
                this.onReady();
                break;
              case 'offline':
                this.onError('Zammad Chat: No agent online');
                this.state = 'off';
                this.destroy({
                  hide: true
                });
                break;
              case 'chat_disabled':
                this.onError('Zammad Chat: Chat is disabled');
                this.state = 'off';
                this.destroy({
                  hide: true
                });
                break;
              case 'no_seats_available':
                this.onError("Zammad Chat: Too many clients in queue. Clients in queue: " + pipe.data.queue);
                this.state = 'off';
                this.destroy({
                  hide: true
                });
                break;
              case 'reconnect':
                this.log.debug('old messages', pipe.data.session);
                this.reopenSession(pipe.data);
            }
        }
      }
    };

    ZammadChat.prototype.onReady = function() {
      this.log.debug('widget ready for use');
      $("." + this.options.buttonClass).click(this.open).removeClass(this.inactiveClass);
      if (this.options.show) {
        return this.show();
      }
    };

    ZammadChat.prototype.onError = function(message) {
      this.log.debug(message);
      return $("." + this.options.buttonClass).hide();
    };

    ZammadChat.prototype.reopenSession = function(data) {
      var i, len, message, ref, unfinishedMessage;
      this.inactiveTimeout.start();
      unfinishedMessage = sessionStorage.getItem('unfinished_message');
      if (data.agent) {
        this.onConnectionEstablished(data);
        ref = data.session;
        for (i = 0, len = ref.length; i < len; i++) {
          message = ref[i];
          this.renderMessage({
            message: message.content,
            id: message.id,
            from: message.created_by_id ? 'agent' : 'customer'
          });
        }
        if (unfinishedMessage) {
          this.input.val(unfinishedMessage);
        }
      }
      if (data.position) {
        this.onQueue(data);
      }
      this.show();
      this.open();
      this.scrollToBottom();
      if (unfinishedMessage) {
        return this.input.focus();
      }
    };

    ZammadChat.prototype.onInput = function() {
      this.el.find('.zammad-chat-message--unread').removeClass('zammad-chat-message--unread');
      sessionStorage.setItem('unfinished_message', this.input.val());
      return this.onTyping();
    };

    ZammadChat.prototype.onTyping = function() {
      if (this.isTyping && this.isTyping > new Date(new Date().getTime() - 1500)) {
        return;
      }
      this.isTyping = new Date();
      this.send('chat_session_typing', {
        session_id: this.sessionId
      });
      return this.inactiveTimeout.start();
    };

    ZammadChat.prototype.onSubmit = function(event) {
      event.preventDefault();
      return this.sendMessage();
    };

    ZammadChat.prototype.sendMessage = function() {
      var message, messageElement;
      message = this.input.val();
      if (!message) {
        return;
      }
      this.inactiveTimeout.start();
      sessionStorage.removeItem('unfinished_message');
      messageElement = this.view('message')({
        message: message,
        from: 'customer',
        id: this._messageCount++,
        unreadClass: ''
      });
      this.maybeAddTimestamp();
      if (this.el.find('.zammad-chat-message--typing').size()) {
        this.lastAddedType = 'typing-placeholder';
        this.el.find('.zammad-chat-message--typing').before(messageElement);
      } else {
        this.lastAddedType = 'message--customer';
        this.el.find('.zammad-chat-body').append(messageElement);
      }
      this.input.val('');
      this.scrollToBottom();
      return this.send('chat_session_message', {
        content: message,
        id: this._messageCount,
        session_id: this.sessionId
      });
    };

    ZammadChat.prototype.receiveMessage = function(data) {
      this.inactiveTimeout.start();
      this.onAgentTypingEnd();
      this.maybeAddTimestamp();
      return this.renderMessage({
        message: data.message.content,
        id: data.id,
        from: 'agent'
      });
    };

    ZammadChat.prototype.renderMessage = function(data) {
      this.lastAddedType = "message--" + data.from;
      data.unreadClass = document.hidden ? ' zammad-chat-message--unread' : '';
      this.el.find('.zammad-chat-body').append(this.view('message')(data));
      return this.scrollToBottom();
    };

    ZammadChat.prototype.open = function() {
      this.log.debug('open widget');
      if (this.isOpen) {
        this.show();
      }
      if (!this.sessionId) {
        this.showLoader();
      }
      this.el.addClass('zammad-chat-is-open');
      if (!this.sessionId) {
        this.el.animate({
          bottom: 0
        }, 500, this.onOpenAnimationEnd);
      } else {
        this.el.css('bottom', 0);
        this.onOpenAnimationEnd();
      }
      this.isOpen = true;
      if (!this.sessionId) {
        return this.send('chat_session_init');
      }
    };

    ZammadChat.prototype.onOpenAnimationEnd = function() {
      return this.idleTimeout.stop();
    };

    ZammadChat.prototype.close = function(event) {
      this.log.debug('close widget');
      if (this.state === 'off' || this.state === 'unsupported') {
        return this.state;
      }
      if (event) {
        event.stopPropagation();
      }
      if (!this.sessionId) {
        return;
      }
      this.send('chat_session_close', {
        session_id: this.sessionId
      });
      this.inactiveTimeout.stop();
      this.waitingListTimeout.stop();
      sessionStorage.removeItem('unfinished_message');
      if (this.onInitialQueueDelayId) {
        clearTimeout(this.onInitialQueueDelayId);
      }
      if (event) {
        this.closeWindow();
      }
      return this.setSessionId(void 0);
    };

    ZammadChat.prototype.closeWindow = function() {
      var remainerHeight;
      this.el.removeClass('zammad-chat-is-open');
      remainerHeight = this.el.height() - this.el.find('.zammad-chat-header').outerHeight();
      return this.el.animate({
        bottom: -remainerHeight
      }, 500, this.onCloseAnimationEnd);
    };

    ZammadChat.prototype.onCloseAnimationEnd = function() {
      this.el.removeClass('zammad-chat-is-visible');
      this.showLoader();
      this.el.find('.zammad-chat-welcome').removeClass('zammad-chat-is-hidden');
      this.el.find('.zammad-chat-agent').addClass('zammad-chat-is-hidden');
      this.el.find('.zammad-chat-agent-status').addClass('zammad-chat-is-hidden');
      this.isOpen = false;
      return this.io.reconnect();
    };

    ZammadChat.prototype.hide = function() {
      if (this.el) {
        return this.el.removeClass('zammad-chat-is-shown');
      }
    };

    ZammadChat.prototype.show = function() {
      var remainerHeight;
      if (this.state === 'off' || this.state === 'unsupported') {
        return this.state;
      }
      this.el.addClass('zammad-chat-is-shown');
      if (!this.inputInitialized) {
        this.inputInitialized = true;
        this.input.autoGrow({
          extraLine: false
        });
      }
      remainerHeight = this.el.height() - this.el.find('.zammad-chat-header').outerHeight();
      return this.el.css('bottom', -remainerHeight);
    };

    ZammadChat.prototype.disableInput = function() {
      this.input.prop('disabled', true);
      return this.el.find('.zammad-chat-send').prop('disabled', true);
    };

    ZammadChat.prototype.enableInput = function() {
      this.input.prop('disabled', false);
      return this.el.find('.zammad-chat-send').prop('disabled', false);
    };

    ZammadChat.prototype.onQueueScreen = function(data) {
      var show;
      this.setSessionId(data.session_id);
      show = (function(_this) {
        return function() {
          _this.onQueue(data);
          return _this.waitingListTimeout.start();
        };
      })(this);
      if (this.initialQueueDelay && !this.onInitialQueueDelayId) {
        this.onInitialQueueDelayId = setTimeout(show, this.initialQueueDelay);
        return;
      }
      if (this.onInitialQueueDelayId) {
        clearTimeout(this.onInitialQueueDelayId);
      }
      return show();
    };

    ZammadChat.prototype.onQueue = function(data) {
      this.log.notice('onQueue', data.position);
      this.inQueue = true;
      return this.el.find('.zammad-chat-body').html(this.view('waiting')({
        position: data.position
      }));
    };

    ZammadChat.prototype.onAgentTypingStart = function() {
      if (this.stopTypingId) {
        clearTimeout(this.stopTypingId);
      }
      this.stopTypingId = setTimeout(this.onAgentTypingEnd, 3000);
      if (this.el.find('.zammad-chat-message--typing').size()) {
        return;
      }
      this.maybeAddTimestamp();
      this.el.find('.zammad-chat-body').append(this.view('typingIndicator')());
      return this.scrollToBottom();
    };

    ZammadChat.prototype.onAgentTypingEnd = function() {
      return this.el.find('.zammad-chat-message--typing').remove();
    };

    ZammadChat.prototype.onLeaveTemporary = function() {
      if (!this.sessionId) {
        return;
      }
      return this.send('chat_session_leave_temporary', {
        session_id: this.sessionId
      });
    };

    ZammadChat.prototype.maybeAddTimestamp = function() {
      var label, time, timestamp;
      timestamp = Date.now();
      if (!this.lastTimestamp || (timestamp - this.lastTimestamp) > this.showTimeEveryXMinutes * 60000) {
        label = this.T('Today');
        time = new Date().toTimeString().substr(0, 5);
        if (this.lastAddedType === 'timestamp') {
          this.updateLastTimestamp(label, time);
          return this.lastTimestamp = timestamp;
        } else {
          this.el.find('.zammad-chat-body').append(this.view('timestamp')({
            label: label,
            time: time
          }));
          this.lastTimestamp = timestamp;
          this.lastAddedType = 'timestamp';
          return this.scrollToBottom();
        }
      }
    };

    ZammadChat.prototype.updateLastTimestamp = function(label, time) {
      return this.el.find('.zammad-chat-body').find('.zammad-chat-timestamp').last().replaceWith(this.view('timestamp')({
        label: label,
        time: time
      }));
    };

    ZammadChat.prototype.addStatus = function(status) {
      this.maybeAddTimestamp();
      this.el.find('.zammad-chat-body').append(this.view('status')({
        status: status
      }));
      return this.scrollToBottom();
    };

    ZammadChat.prototype.scrollToBottom = function() {
      return this.el.find('.zammad-chat-body').scrollTop($('.zammad-chat-body').prop('scrollHeight'));
    };

    ZammadChat.prototype.destroy = function(params) {
      if (params == null) {
        params = {};
      }
      this.log.debug('destroy widget');
      if (params.hide) {
        if (this.el) {
          this.el.remove();
        }
      }
      this.waitingListTimeout.stop();
      this.inactiveTimeout.stop();
      this.idleTimeout.stop();
      this.wsReconnectStop();
      return this.io.close();
    };

    ZammadChat.prototype.wsReconnectStart = function() {
      this.wsReconnectStop();
      if (this.reconnectDelayId) {
        clearTimeout(this.reconnectDelayId);
      }
      return this.reconnectDelayId = setTimeout(this.io.connect(), 5000);
    };

    ZammadChat.prototype.wsReconnectStop = function() {
      if (this.reconnectDelayId) {
        return clearTimeout(this.reconnectDelayId);
      }
    };

    ZammadChat.prototype.reconnect = function() {
      this.log.notice('reconnecting');
      this.disableInput();
      this.lastAddedType = 'status';
      this.setAgentOnlineState('connecting');
      return this.addStatus(this.T('Connection lost'));
    };

    ZammadChat.prototype.onConnectionReestablished = function() {
      this.lastAddedType = 'status';
      this.setAgentOnlineState('online');
      return this.addStatus(this.T('Connection re-established'));
    };

    ZammadChat.prototype.onSessionClosed = function(data) {
      this.addStatus(this.T('Chat closed by %s', data.realname));
      this.disableInput();
      this.setAgentOnlineState('offline');
      return this.inactiveTimeout.stop();
    };

    ZammadChat.prototype.setSessionId = function(id) {
      this.sessionId = id;
      if (id === void 0) {
        return sessionStorage.removeItem('sessionId');
      } else {
        return sessionStorage.setItem('sessionId', id);
      }
    };

    ZammadChat.prototype.onConnectionEstablished = function(data) {
      if (this.onInitialQueueDelayId) {
        clearTimeout(this.onInitialQueueDelayId);
      }
      this.inQueue = false;
      if (data.agent) {
        this.agent = data.agent;
      }
      if (data.session_id) {
        this.setSessionId(data.session_id);
      }
      this.el.find('.zammad-chat-agent').html(this.view('agent')({
        agent: this.agent
      }));
      this.enableInput();
      this.el.find('.zammad-chat-body').empty();
      this.el.find('.zammad-chat-welcome').addClass('zammad-chat-is-hidden');
      this.el.find('.zammad-chat-agent').removeClass('zammad-chat-is-hidden');
      this.el.find('.zammad-chat-agent-status').removeClass('zammad-chat-is-hidden');
      this.input.focus();
      this.setAgentOnlineState('online');
      this.waitingListTimeout.stop();
      this.idleTimeout.stop();
      return this.inactiveTimeout.start();
    };

    ZammadChat.prototype.showCustomerTimeout = function() {
      var reload;
      this.el.find('.zammad-chat-body').html(this.view('customer_timeout')({
        agent: this.agent.name,
        delay: this.options.inactiveTimeout
      }));
      this.close();
      reload = function() {
        return location.reload();
      };
      return this.el.find('.js-restart').click(reload);
    };

    ZammadChat.prototype.showWaitingListTimeout = function() {
      var reload;
      this.el.find('.zammad-chat-body').html(this.view('waiting_list_timeout')({
        delay: this.options.watingListTimeout
      }));
      this.close();
      reload = function() {
        return location.reload();
      };
      return this.el.find('.js-restart').click(reload);
    };

    ZammadChat.prototype.showLoader = function() {
      return this.el.find('.zammad-chat-body').html(this.view('loader')());
    };

    ZammadChat.prototype.setAgentOnlineState = function(state) {
      var capitalizedState;
      this.state = state;
      capitalizedState = state.charAt(0).toUpperCase() + state.slice(1);
      return this.el.find('.zammad-chat-agent-status').attr('data-status', state).text(this.T(capitalizedState));
    };

    ZammadChat.prototype.detectHost = function() {
      var protocol;
      protocol = 'ws://';
      if (window.location.protocol === 'https:') {
        protocol = 'wss://';
      }
      return this.options.host = "" + protocol + scriptHost + "/ws";
    };

    ZammadChat.prototype.loadCss = function() {
      var newSS, styles, url;
      if (!this.options.cssAutoload) {
        return;
      }
      url = this.options.cssUrl;
      if (!url) {
        url = this.options.host.replace(/^wss/i, 'https').replace(/^ws/i, 'http').replace(/\/ws/i, '');
        url += '/assets/chat/chat.css';
      }
      this.log.debug("load css from '" + url + "'");
      styles = "@import url('" + url + "');";
      newSS = document.createElement('link');
      newSS.rel = 'stylesheet';
      newSS.href = 'data:text/css,' + escape(styles);
      return document.getElementsByTagName('head')[0].appendChild(newSS);
    };

    ZammadChat.prototype.startTimeoutObservers = function() {
      this.idleTimeout = new Timeout({
        logPrefix: 'idleTimeout',
        debug: this.options.debug,
        timeout: this.options.idleTimeout,
        timeoutIntervallCheck: this.options.idleTimeoutIntervallCheck,
        callback: (function(_this) {
          return function() {
            _this.log.debug('Idle timeout reached, hide widget', new Date);
            _this.state = 'off';
            return _this.destroy({
              hide: true
            });
          };
        })(this)
      });
      this.inactiveTimeout = new Timeout({
        logPrefix: 'inactiveTimeout',
        debug: this.options.debug,
        timeout: this.options.inactiveTimeout,
        timeoutIntervallCheck: this.options.inactiveTimeoutIntervallCheck,
        callback: (function(_this) {
          return function() {
            _this.log.debug('Inactive timeout reached, show timeout screen.', new Date);
            _this.state = 'off';
            _this.setAgentOnlineState('offline');
            _this.showCustomerTimeout();
            return _this.destroy({
              hide: false
            });
          };
        })(this)
      });
      return this.waitingListTimeout = new Timeout({
        logPrefix: 'waitingListTimeout',
        debug: this.options.debug,
        timeout: this.options.waitingListTimeout,
        timeoutIntervallCheck: this.options.waitingListTimeoutIntervallCheck,
        callback: (function(_this) {
          return function() {
            _this.log.debug('Waiting list timeout reached, show timeout screen.', new Date);
            _this.state = 'off';
            _this.setAgentOnlineState('offline');
            _this.showWaitingListTimeout();
            return _this.destroy({
              hide: false
            });
          };
        })(this)
      });
    };

    return ZammadChat;

  })(Base);
  return window.ZammadChat = ZammadChat;
})(window.jQuery, window);

if (!window.zammadChatTemplates) {
  window.zammadChatTemplates = {};
}
window.zammadChatTemplates["agent"] = function (__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      if (this.agent.avatar) {
        __out.push('\n<img class="zammad-chat-agent-avatar" src="');
        __out.push(__sanitize(this.agent.avatar));
        __out.push('">\n');
      }
    
      __out.push('\n<span class="zammad-chat-agent-sentence">\n  <span class="zammad-chat-agent-name">');
    
      __out.push(__sanitize(this.agent.name));
    
      __out.push('</span>\n</span>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
};

/*!
 * ----------------------------------------------------------------------------
 * "THE BEER-WARE LICENSE" (Revision 42):
 * <jevin9@gmail.com> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return. Jevin O. Sewaruth
 * ----------------------------------------------------------------------------
 *
 * Autogrow Textarea Plugin Version v3.0
 * http://www.technoreply.com/autogrow-textarea-plugin-3-0
 * 
 * THIS PLUGIN IS DELIVERD ON A PAY WHAT YOU WHANT BASIS. IF THE PLUGIN WAS USEFUL TO YOU, PLEASE CONSIDER BUYING THE PLUGIN HERE :
 * https://sites.fastspring.com/technoreply/instant/autogrowtextareaplugin
 *
 * Date: October 15, 2012
 *
 * Zammad modification: remove overflow:hidden when maximum height is reached
 *
 */

jQuery.fn.autoGrow = function(options) {
  return this.each(function() {
    var settings = jQuery.extend({
      extraLine: true,
    }, options);

    var createMirror = function(textarea) {
      jQuery(textarea).after('<div class="autogrow-textarea-mirror"></div>');
      return jQuery(textarea).next('.autogrow-textarea-mirror')[0];
    }

    var sendContentToMirror = function (textarea) {
      mirror.innerHTML = String(textarea.value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/ /g, '&nbsp;')
        .replace(/\n/g, '<br />') +
        (settings.extraLine? '.<br/>.' : '')
      ;

      if (jQuery(textarea).height() != jQuery(mirror).height()) {
        jQuery(textarea).height(jQuery(mirror).height());

        var maxHeight = parseInt(jQuery(textarea).css('max-height'), 10);
        var overflow = jQuery(mirror).height() > maxHeight ? '' : 'hidden'
        jQuery(textarea).css('overflow', overflow);
      }
    }

    var growTextarea = function () {
      sendContentToMirror(this);
    }

    // Create a mirror
    var mirror = createMirror(this);
    
    // Style the mirror
    mirror.style.display = 'none';
    mirror.style.wordWrap = 'break-word';
    mirror.style.whiteSpace = 'normal';
    mirror.style.padding = jQuery(this).css('paddingTop') + ' ' + 
      jQuery(this).css('paddingRight') + ' ' + 
      jQuery(this).css('paddingBottom') + ' ' + 
      jQuery(this).css('paddingLeft');
      
    mirror.style.width = jQuery(this).css('width');
    mirror.style.fontFamily = jQuery(this).css('font-family');
    mirror.style.fontSize = jQuery(this).css('font-size');
    mirror.style.lineHeight = jQuery(this).css('line-height');

    // Style the textarea
    this.style.overflow = "hidden";
    this.style.minHeight = this.rows+"em";

    // Bind the textarea's event
    this.onkeyup = growTextarea;

    // Fire the event for text already present
    sendContentToMirror(this);

  });
};
if (!window.zammadChatTemplates) {
  window.zammadChatTemplates = {};
}
window.zammadChatTemplates["chat"] = function (__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class="zammad-chat');
    
      if (this.flat) {
        __out.push(__sanitize(' zammad-chat--flat'));
      }
    
      __out.push('"');
    
      if (this.fontSize) {
        __out.push(__sanitize(" style='font-size: " + this.fontSize + "'"));
      }
    
      __out.push('>\n  <div class="zammad-chat-header js-chat-open"');
    
      if (this.background) {
        __out.push(__sanitize(" style='background: " + this.background + "'"));
      }
    
      __out.push('>\n    <div class="zammad-chat-header-controls">\n      <span class="zammad-chat-agent-status zammad-chat-is-hidden" data-status="online"></span>\n      <span class="zammad-chat-header-icon">\n        <svg class="zammad-chat-header-icon-open" viewBox="0 0 13 7"><path d="M10.807 7l1.4-1.428-5-4.9L6.5-.02l-.7.7-4.9 4.9 1.414 1.413L6.5 2.886 10.807 7z" fill-rule="evenodd"/></svg>\n        <svg class="zammad-chat-header-icon-close js-chat-close" viewBox="0 0 13 13"><path d="m2.241.12l-2.121 2.121 4.243 4.243-4.243 4.243 2.121 2.121 4.243-4.243 4.243 4.243 2.121-2.121-4.243-4.243 4.243-4.243-2.121-2.121-4.243 4.243-4.243-4.243" fill-rule="evenodd"/></svg>\n      </span>\n    </div>\n    <div class="zammad-chat-agent zammad-chat-is-hidden">\n    </div>\n    <div class="zammad-chat-welcome">\n      <svg class="zammad-chat-icon" viewBox="0 0 24 24"><path d="M2 5C2 4 3 3 4 3h16c1 0 2 1 2 2v10C22 16 21 17 20 17H4C3 17 2 16 2 15V5zM12 17l6 4v-4h-6z" fill-rule="evenodd"/></svg>\n      <span class="zammad-chat-welcome-text">');
    
      __out.push(this.T(this.title));
    
      __out.push('</span>\n    </div>\n  </div>\n  <div class="zammad-chat-body"></div>\n  <form class="zammad-chat-controls">\n    <textarea class="zammad-chat-input" rows="1" placeholder="');
    
      __out.push(this.T('Compose your message...'));
    
      __out.push('"></textarea>\n    <button type="submit" class="zammad-chat-button zammad-chat-send"');
    
      if (this.background) {
        __out.push(__sanitize(" style='background: " + this.background + "'"));
      }
    
      __out.push('>');
    
      __out.push(this.T('Send'));
    
      __out.push('</button>\n  </form>\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
};

if (!window.zammadChatTemplates) {
  window.zammadChatTemplates = {};
}
window.zammadChatTemplates["customer_timeout"] = function (__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class="zammad-chat-modal">\n  <div class="zammad-chat-modal-text">\n    ');
    
      if (this.agent) {
        __out.push('\n      ');
        __out.push(this.T('Since you didn\'t respond in the last %s minutes your conversation with <strong>%s</strong> got closed.', this.delay, this.agent));
        __out.push('\n    ');
      } else {
        __out.push('\n      ');
        __out.push(this.T('Since you didn\'t respond in the last %s minutes your conversation got closed.', this.delay));
        __out.push('\n    ');
      }
    
      __out.push('\n    <br>\n    <div class="zammad-chat-button js-restart"');
    
      if (this.background) {
        __out.push(__sanitize(" style='background: " + this.background + "'"));
      }
    
      __out.push('>');
    
      __out.push(this.T('Start new conversation'));
    
      __out.push('</div>\n  </div>\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
};

if (!window.zammadChatTemplates) {
  window.zammadChatTemplates = {};
}
window.zammadChatTemplates["loader"] = function (__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class="zammad-chat-modal">\n  <span class="zammad-chat-loading-animation">\n    <span class="zammad-chat-loading-circle"></span>\n    <span class="zammad-chat-loading-circle"></span>\n    <span class="zammad-chat-loading-circle"></span>\n  </span>\n  <span class="zammad-chat-modal-text">');
    
      __out.push(this.T('Connecting'));
    
      __out.push('</span>\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
};

if (!window.zammadChatTemplates) {
  window.zammadChatTemplates = {};
}
window.zammadChatTemplates["message"] = function (__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class="zammad-chat-message zammad-chat-message--');
    
      __out.push(__sanitize(this.from));
    
      __out.push(__sanitize(this.unreadClass));
    
      __out.push('">\n  <span class="zammad-chat-message-body"');
    
      if (this.background && this.from === 'customer') {
        __out.push(__sanitize(" style='background: " + this.background + "'"));
      }
    
      __out.push('>');
    
      __out.push(this.message);
    
      __out.push('</span>\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
};

if (!window.zammadChatTemplates) {
  window.zammadChatTemplates = {};
}
window.zammadChatTemplates["status"] = function (__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class="zammad-chat-status">');
    
      __out.push(this.status);
    
      __out.push('</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
};

if (!window.zammadChatTemplates) {
  window.zammadChatTemplates = {};
}
window.zammadChatTemplates["timestamp"] = function (__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class="zammad-chat-timestamp"><strong>');
    
      __out.push(__sanitize(this.label));
    
      __out.push('</strong> ');
    
      __out.push(__sanitize(this.time));
    
      __out.push('</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
};

if (!window.zammadChatTemplates) {
  window.zammadChatTemplates = {};
}
window.zammadChatTemplates["typingIndicator"] = function (__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class="zammad-chat-message zammad-chat-message--typing zammad-chat-message--agent">\n  <span class="zammad-chat-message-body">\n    <span class="zammad-chat-loading-animation">\n      <span class="zammad-chat-loading-circle"></span>\n      <span class="zammad-chat-loading-circle"></span>\n      <span class="zammad-chat-loading-circle"></span>\n    </span>\n  </span>\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
};

if (!window.zammadChatTemplates) {
  window.zammadChatTemplates = {};
}
window.zammadChatTemplates["waiting"] = function (__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class="zammad-chat-modal">\n  <div class="zammad-chat-modal-text">\n    <span class="zammad-chat-loading-animation">\n      <span class="zammad-chat-loading-circle"></span>\n      <span class="zammad-chat-loading-circle"></span>\n      <span class="zammad-chat-loading-circle"></span>\n    </span>\n    ');
    
      __out.push(this.T('All colleges are busy.'));
    
      __out.push('<br>\n    ');
    
      __out.push(this.T('You are on waiting list position <strong>%s</strong>.', this.position));
    
      __out.push('\n  </div>\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
};

if (!window.zammadChatTemplates) {
  window.zammadChatTemplates = {};
}
window.zammadChatTemplates["waiting_list_timeout"] = function (__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class="zammad-chat-modal">\n  <div class="zammad-chat-modal-text">\n    ');
    
      __out.push(this.T('We are sorry, it takes longer as expected to get an empty slot. Please try again later or send us an email. Thank you!'));
    
      __out.push('\n    <br>\n    <div class="zammad-chat-button js-restart"');
    
      if (this.background) {
        __out.push(__sanitize(" style='background: " + this.background + "'"));
      }
    
      __out.push('>');
    
      __out.push(this.T('Start new conversation'));
    
      __out.push('</div>\n  </div>\n</div>');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
};
