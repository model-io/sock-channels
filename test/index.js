var Browser = require('zombie');
var expect = require('expect.js');
var sockjs = require('sockjs');
var http = require('http');

var app = require('./server/app');
var ws = sockjs.createServer();
var ServerChannel = require('../');

describe('sock-channels', function() {
  var clientCh, conn, serverCh, server, connect, thing, ClientChannel;
  var browser = new Browser();

  before(function(done) {
    server = http.Server(app);
    ws.installHandlers(server, {prefix:'/ws'});
    serverCh = new ServerChannel(ws, 'root');
    serverCh.onConnect.addOnce(function(c) {
      conn = c;
      done();
    });
    server.listen(3000, function() {
      browser.visit('http://localhost:3000/', function() {
        ClientChannel = browser.window.Channel;
        clientCh = browser.window.clientCh;
      });
    });
  });

  describe('multiplexing', function() {
    it('should be possible server side', function() {
      var Channel = ServerChannel;
      expect(serverCh).to.be.a(Channel);
      var fooCh = serverCh.sub('foo');
      var barCh = serverCh.sub('bar');
      var foobazCh = fooCh.sub('baz');
      expect(fooCh).to.be.a(Channel);
      expect(barCh).to.be.a(Channel);
      expect(foobazCh).to.be.a(Channel);
    });
    it('should be possible client side', function() {
      var Channel = ClientChannel;
      expect(clientCh).to.be.a(Channel);
      var fooCh = clientCh.sub('foo');
      var barCh = clientCh.sub('bar');
      var foobazCh = fooCh.sub('baz');
      expect(fooCh).to.be.a(Channel);
      expect(barCh).to.be.a(Channel);
      expect(foobazCh).to.be.a(Channel);
    });
  });

  describe('writing Objects to connection', function() {
    var thing = {bar: 'foo', baz: [123, true]};
    //TODO make this work
    //thing.me = thing; //circular

    it('should be possible from server to client throught connection', function(done) {
      clientCh.onData.addOnce(function (data) {
        expect(data).to.eql(thing);
        done();
      });
      conn.write(serverCh, thing);
    });

    it('should be possible from server to client throught channel', function(done) {
      clientCh.onData.addOnce(function (data) {
        expect(data).to.eql(thing);
        done();
      });
      serverCh.write(conn, thing);
    });

    it('should be possible from client to server thought channel', function(done) {
      serverCh.onData.addOnce(function(conn, data) {
        expect(conn).to.eql(conn);
        expect(data).to.eql(thing);
        done();
      });
      clientCh.write(thing);
    });

    it('should be possible from client to server thought connection', function(done) {
      conn.onData.addOnce(function(channel, data) {
        expect(channel).to.eql(serverCh);
        expect(data).to.eql(thing);
        done();
      });
      clientCh.write(thing);
    });

  });

  describe('channel', function() {
    it('should recive according data', function(done) {
      var fozServerCh = serverCh.sub('foz');
      var fozClientCh = clientCh.sub('foz');
      fozServerCh.onData.addOnce(function(conn, data) {
        expect(data).not.to.be('bar');
        expect(data).to.be('foz');
        done();
      });
      clientCh.write('bar');
      fozClientCh.write('foz');
    });
  });

  afterEach(function() {
    conn.removeAll();
    serverCh.removeAll();
    clientCh.removeAll();
  });

  after(function() {
    server.close();
  });
});
