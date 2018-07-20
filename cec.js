"use strict";

var utils = require(__dirname + '/lib/utils'),
    spawn = require('child_process').spawn,
    soef = require(__dirname + '/lib/soef'),
    devices = new soef.Devices(),
    g_dev = new devices.CDevice('','',[]),
    CEC = require('./lib/cec-functions');

var cec,
    g_initCount = 0,
    ownLogicalAddress = { i: -1, c: 'e' };

var orOSDName = 'ioBroker';
var orType = 'r';

function buildOrOSDName() {
    orOSDName = adapter.config.name || orOSDName;
    orType = adapter.config.type || 'r';
    //if (adapter.config.name != orOSDName) {
    //    orOSDName = adapter.config.name;
    //    return;
    //}
    //var os = require('os');
    //var hostName = os.hostname();
    //
    //orOSDName += '-' + hostName;
}

function bo(val) {
    return ((val >> 0) ? true : false);
}

function toHex(n) {
    var s = n.toString(16);
    if (s.length < 2) {
        s = '0' + s;
    }
    return s;
}

var adapter = utils.adapter({
    name: 'cec',

    unload: function (callback) {
        try {
            callback();
        } catch (e) {
            callback();
        }
    },
    discover: function (callback) {
    },
    install: function (callback) {
    },
    uninstall: function (callback) {
    },
    objectChange: function (id, obj) {
    },
    stateChange: function (id, state) {
        if (state && !state.ack) {
            stateChange(id, state);
        }
    },
    ready: function () {
        //return REMOVE_ALL(adapter, function() {
        //    devices.init(adapter, function(err) {
        //        main();
        //    });
        //});
        devices.init(adapter, function(err) {
            buildOrOSDName();
            main();
        });
    }
});


var cecDevices = {

    //list: new Map(),
    //
    //forEach: function (callback, pattern) {
    //    var arr = this.list.keys();
    //    for (var i=0; i<this.list.size; i++) {
    //        var cur = arr.next();
    //        var id = cur.value;
    //        if (id == ownLogicalAddress.i) continue;
    //        if (pattern !== undefined) {
    //            var s = pattern.replace('%s', id.toString(16));
    //            callback.call(cec, s);
    //        } else {
    //            var ret = callback(id.toString(16), this.list.get(id));
    //            if (ret !== undefined) {
    //                return ret;
    //            }
    //        }
    //    }
    //},
    //id2: function(_id) {
    //    return (typeof _id === 'number') ? _id : ('0x' + _id) >> 0;
    //},
    //set: function (id, prop, val) {
    //    id = this.id2(id);
    //    if (id > 15) return;
    //    adapter.log.debug('-------- set: ' + id + '.' + prop + ' = ' + val);
    //    var o = this.list.get(id);
    //    if (o === undefined) {
    //        o = {};
    //        this.list.set(id, o);
    //    }
    //    o[prop] = val;
    //
    //    var d = g_dev.dset(id.toString(16), prop, val);
    //    if (g_initCount >= 10 && d !== undefined /*&& g_dev.list.length > 0*/) {
    //        g_dev.update();
    //    }
    //},
    //get: function(id) {
    //    return this.list.get(this.id2(id));
    //},

    list: {},

    forEach: function (callback, pattern) {
        for (var i in this.list) {
            var id = i.toString(16);
            if (id == ownLogicalAddress.c) continue;
            if (pattern !== undefined) {
                var s = pattern.replace('%s', id);
                callback.call(cec, s);
            } else {
                var ret = callback(id, this.list[id]);
                if (ret !== undefined) {
                    return ret;
                }
            }
        }
    },
    id2: function(_id) {
        return (typeof _id === 'number') ? _id : ('0x' + _id) >> 0;
    },
    set: function (id, prop, val) {
        id = this.id2(id);
        if (id > 15) return;
        adapter.log.debug('-------- set: ' + id + '.' + prop + ' = ' + val);
        var o = this.list[id];
        if (o === undefined) {
            o = {};
            this.list[id] = o;
        }
        o[prop] = val;

        var d = g_dev.dset(id.toString(16), prop, val);
        if (g_initCount >= 10 && d !== undefined) {
            g_dev.update();
        }
    },

    get: function(id) {
        return this.list.get[this.id2(id)];
    },

    phy2loc: function(physicalAddress) {
        var id = this.forEach (function (id, o) {
            if (o.address === physicalAddress) {
                return id;
            }
        });
        return id;
    },

    setActive: function (id, val) {
        if (val || this.get(id) !== undefined) {
            this.set(id, 'active', bo(val));
        }
    },
    setPower: function (id, val) {
        this.set(id, 'power', bo(val));
    },
    setMute: function (id, val) {
        this.set(id, 'mute', bo(val));
    },
    setAudioMode: function (id, val) {
        this.set(id, 'audioMode', bo(val));
    },
    setVolume: function (id, val) {
        this.set(id, 'volume', val >> 0);
    },
    setAddress: function (id, val) {
        this.set(id, 'address', val);
    },
    addrToString: function(args, arg2) {
        return Array.isArray(args) ? (args[0] >> 4) + '.' + (args[0] & 0xF) + '.' + (args[1] >> 4) + '.' + (args[1] & 0xF) :
                                     (args >> 4) + '.' + (args & 0xF) + '.' + (arg2 >> 4) + '.' + (arg2 & 0xF);
    },
    setAddressByMsg: function (msg) {
        this.setAddress(msg.source, this.addrToString(msg.args));
    },
    setActiveSource: function (addr, addr1, val) {
        if (val === undefined) {
            val = addr1;
            addr1 = null;
        }
        var s = this.addrToString(addr, addr1);
        var o = devices.get(commonStates.ACTIVE_SOURCE);
        if (val) {
            devices.root.rset(commonStates.ACTIVE_SOURCE, s, true);
        } else if (o && o.val == s) {
            devices.root.rset(commonStates.ACTIVE_SOURCE, '');
        }
        var id = this.phy2loc(s);
        if (id !== undefined) {
            this.set(id, 'active-source', val);
        }
        return id;
    },
    setVendor: function (id, val) {
        this.set(id, 'vendor', val);
    },
    setOSD: function (id, val) {
        this.set(id, 'osd', val);
        if (g_initCount >= 10) {
            devices.setObjectName(id, val);
        }
    },
    setDeviceType: function(id, deviceType) {
        deviceType = CEC.deviceTypeNames[deviceType];
        this.set(id, 'type', deviceType);
    }

};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function NODECec (clientName) {

    var that = this,
        timer = null,
        ready = true,
        waitFor = '',
        sendCallback = null,
        lastSnd = '',
        queue = [],
        dataBuffer = '',
        clientName = clientName || 'cec-client';

    function onData(data) {
        dataBuffer += data;
        var n = dataBuffer.indexOf('\n');
        while (n >= 0) {
            that.onLine(dataBuffer.substr(0, n));
            dataBuffer = dataBuffer.substring(n + 1);
            n = dataBuffer.indexOf('\n');
        }
        return true;
    }

    function onClose () {
        //this.emit('stop', this);
        //this.client.kill('SIGINT');
        adapter.log.error('Exiting...');
        setTimeout(function() {
            process.exit();
        }, 500);
    }

    NODECec.prototype.start = function(_args) {

        var args = _args.split(' ');
        this.client = spawn(clientName, args);
        this.client.on('close', onClose);
        this.client.stdout.on('data', onData);
        this.client.stdout.on('end', function() {
            if (dataBuffer) {
                that.onLine(dataBuffer);
            }
        });
    };

    NODECec.prototype.stop = function() {
        onClose();
    };

    function x2d(id) {
        return parseInt(id, 16);
    }

    function clearTimer() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    }

    function setTimer() {
        clearTimer();
        timer = setTimeout(function () {
            adapter.log.debug('###################### called by timer ==> ' + lastSnd + ' opcode: ' + CEC.getOpcodeName(waitFor) + ' ' + waitFor.toString(16));
            that._pop();
        }, 5000);
    }

    NODECec.prototype.pop = function (opcode) {
    };

    NODECec.prototype.popWaitingForInput = function () {
        //adapter.log.debug('~~~~ pop from waiting for Input');
        this._pop();
    };

    NODECec.prototype.popOnLine = function (opcode) {
        //adapter.log.debug('~~~~ pop from onLine');
        this._pop(opcode);
    };

    NODECec.prototype._pop = function (opcode) {
        adapter.log.debug('pop called: opcode=' + opcode + ' ready=' + ready);
        if (ready) return;
        if (opcode !== undefined && waitFor != '') {
            if (opcode !== waitFor) {
                return;
            }
        }
        waitFor = '';
        if (queue.length > 0) {
            var cmd = queue.shift();
            this.snd(cmd);
            if (queue.length > 0) {
                setTimer();
            }
        } else {
            clearTimer();
            ready = true;
            adapter.log.debug('pop called: ready=' + ready);
            if (sendCallback) {
                var cb = sendCallback;
                sendCallback = null;
                cb();
                adapter.log.debug(':::::::::::::::::: pop: callback called=' + cb.name);
            }
        }
    };

    NODECec.prototype.snd = function (msg) {
        msg = msg.replace('%o', ownLogicalAddress.c);
        if (msg.indexOf('tx') === 0) {
            adapter.log.debug('snd: ' + msg[3] + '->' + msg[4] + ' ' + CEC.getOpcodeName(msg.substr(6,2)) + ' ' + msg);
        } else {
            adapter.log.debug('snd: --> ' + msg);
        }
        lastSnd = msg;
        that.client.stdin.write(msg);
        waitFor = CEC.getResponseOpcode(msg);
    };

    NODECec.prototype.send = function (msg) {
        if (!ready && g_initCount < 10) {
            //adapter.log.debug('send -> push -> ' + msg);
            queue.push(msg);
            if (!timer) setTimer();
        } else {
            ready = false;
            //adapter.log.debug('ready=false');
            that.snd(msg);
        }
    };


    this.sendTxCmd = function () {
        if (arguments.length <= 0) {
            return;
        }
        var cmd = 'tx '; // + ownLogicalAddress.c;
        for (var i=0; i<arguments.length; i++) {
            cmd += (cmd.length>4) ? ':' : '';
            if (typeof arguments[i] === 'number') {
                cmd += toHex(arguments[i]);
            } else {
                cmd += arguments[i];
            }
        }
        that.send(cmd);
    };

    function startInit() {
        if (g_initCount >= 4) return;
        g_initCount = 4;
        that.sendTxCmd('%o5', CEC.CEC_OPCODE.GIVE_AUDIO_STATUS);

        //cecDevices.forEach(that.send, 'tx e%s:' + CEC.CEC_OPCODE.GIVE_DEVICE_POWER_STATUS.toString(16));
        cecDevices.forEach(that.sendTxCmd, '%o%s:' + toHex(CEC.CEC_OPCODE.GIVE_DEVICE_POWER_STATUS));

        //cecDevices.forEach(that.send, 'tx e%s:' + CEC.CEC_OPCODE.GIVE_PHYSICAL_ADDRESS.toString(16));
        //cecDevices.forEach(that.sendTxCmd, '%s:' + toHex(CEC.CEC_OPCODE.GIVE_OSD_NAME)); // GIVE_OSD_NAME
        cecDevices.forEach(that.send, 'name %s'); // CEC.CEC_OPCODE.GIVE_OSD_NAME

        //that.send('tx ef:' + toHex(CEC.CEC_OPCODE.REQUEST_ACTIVE_SOURCE));
        //that.send('tx %of:' + toHex(CEC.CEC_OPCODE.REQUEST_ACTIVE_SOURCE));

        sendCallback = finalizeInit;
    }

    function listActiveDevices() {
        g_initCount = 2;
        sendCallback = startInit;
        that.send('lad');
        //for (var i=0; i<14; i++) {
        //    that.send('ad ' + i);
        //}
    }

    function createObjects () {
        var dev = g_dev;
        cecDevices.forEach(function (i, o) {
            //i = i.toString(16);
            //adapter.log.debug('device: ' + i + ' ' + o.osd ? o.osd : o.vendor ? o.vendor : i);
            for (var j in o) {
                //adapter.log.debug('device.' + i + ': j: ' + j + ' =' + o[j]);
                dev.dset(i, j, o[j]);
            }
            dev.setObjectName(i, o.osd ? o.osd : o.vendor ? o.vendor : i);
        });
        dev.setObjectName(ownLogicalAddress.c, orOSDName);
        dev.update();
    }

    function finalizeInit () {
        setTimeout(function () {
            createObjects();
            g_initCount = 10;
        }, 3000);
    }

    NODECec.prototype.checkPowerState = function () {
        setTimeout(function () {
            cecDevices.forEach(that.send, 'pow %s');
        }, 1000);
    };

    NODECec.prototype.onMessage = function (msg) {
        adapter.log.debug('onMessage: ' + msg.source + '->' + msg.target + ' ' + CEC.getOpcodeName(msg.opcode) +  ' ' + msg.tokens.join(':'));

        if (msg.args.length < CEC.responseLength(msg.opcode)) {
            return;
        }

        switch (msg.opcode) {
            case CEC.CEC_OPCODE.NONE:
                if (g_initCount < 1 && msg.source===msg.target) { //this may happen multiple time, if first address of type is already taken.
                    ownLogicalAddress.c = msg.source;
                    ownLogicalAddress.i = parseInt(msg.source, 16);
                }
                return true;

            case CEC.CEC_OPCODE.IMAGE_VIEW_ON:
                //cecDevices.setAchtiveSource(msg.source, true);
                break;

            case CEC.CEC_OPCODE.VENDOR_REMOTE_BUTTON_UP:
                var key = CEC.userControlCodes.get(msg.args[0]);
                devices.root.rset(commonStates.KEY_UP, key);
                devices.root.rset(commonStates.KEY_DOWN, '');
                adapter.log.debug("KEY_UP: " + key);
                break;

            case CEC.CEC_OPCODE.VENDOR_REMOTE_BUTTON_DOWN:
                break;

            case CEC.CEC_OPCODE.USER_CONTROL_PRESSED:
                var key = CEC.userControlCodes.get(msg.args[0]);
                devices.root.rset(commonStates.KEY_DOWN, key);
                devices.root.rset(commonStates.KEY_UP, '');
                adapter.log.debug("KEY_DOWN: " + key);
                break;

            case CEC.CEC_OPCODE.USER_CONTROL_RELEASE:
                break;

            case CEC.CEC_OPCODE.SET_MENU_LANGUAGE:
                break;

            case CEC.CEC_OPCODE.CEC_VERSION:
                return true;

            case CEC.CEC_OPCODE.STANDBY:
                cecDevices.setPower(msg.source, false);
                if (x2d(msg.source) == 0) {
                    devices.root.rset(commonStates.POWER_TV, false, true);
                }
                if(msg.target == 'f') {
                    devices.root.rset(commonStates.POWER_AUDIO, false, true);
                }
                //if (g_final && (msg.source >> 0) == 0) {
                //    this.checkPowerState();
                //}
                return true;

            case CEC.CEC_OPCODE.SET_SYSTEM_AUDIO_MODE:
                var val = bo(msg.args[0]);
                cecDevices.setAudioMode(msg.source, val);
                if (x2d(msg.source) == 5 /*&& val*/) {
                    devices.root.rset(commonStates.POWER_AUDIO, val);
                }
                devices.root.rset(commonStates.AUDIO_MODE, val);
                break;
                return true;

            case CEC.CEC_OPCODE.ROUTING_INFORMATION:
                cecDevices.setAddressByMsg(msg);
                return true;

            case CEC.CEC_OPCODE.ACTIVE_SOURCE:
                cecDevices.setActiveSource(msg.args, true);
                break;

            case CEC.CEC_OPCODE.INACTIVE_SOURCE:
                cecDevices.setActiveSource(msg.args, false);
                return true;

            case CEC.CEC_OPCODE.REPORT_POWER_STATUS:
                var val = (msg.args[0] & CEC.CEC_POWER_STATUS.STANDBY) == 0;
                cecDevices.setPower(msg.source, val);
                break;

            case CEC.CEC_OPCODE.REPORT_AUDIO_STATUS:
                cecDevices.setMute(msg.source, msg.args[0] & CEC.CEC_AUDIO_STATUS.MUTE_STATUS_MASK);
                cecDevices.setVolume(msg.source, msg.args[0] & CEC.CEC_AUDIO_STATUS.VOLUME_STATUS_MASK);
                break;

            case CEC.CEC_OPCODE.DEVICE_VENDOR_ID:
                var vid = (msg.args[0] << 16) | (msg.args[1] << 8) | msg.args[2];
                vid = CEC.vendorIds.get(vid);
                cecDevices.setVendor(msg.source, vid);
                break;

            case CEC.CEC_OPCODE.REPORT_PHYSICAL_ADDRESS:
                var deviceType = msg.args[2];
                cecDevices.setDeviceType(msg.source, deviceType);
                cecDevices.setAddressByMsg(msg);
                break;

            case CEC.CEC_OPCODE.SET_OSD_NAME:
                var osdname = String.fromCharCode.apply(null, msg.args);
                cecDevices.setOSD(msg.source, osdname);
                break;

            case CEC.CEC_OPCODE.ROUTING_CHANGE:
                cecDevices.setActiveSource(msg.args, false);
                cecDevices.setActiveSource(msg.args[2], msg.args[3], true);
                if (x2d(msg.source) == 0) {
                    devices.root.rset(commonStates.POWER_TV, true, true);
                }
                break;

            default:
                return false;
        }
        this.pop(msg.opcode);
        return true;
    };

    var ladTimer = null;
    var reLine2 = /(TRAFFIC:)(?:.*) ([0-9a-f:]*)$|^(.*?)(?:\s)([0-9A-Fa-f])(?:\s|$)(.*)|([^#|:]{0,20})/;

    NODECec.prototype.onLine = function(line) {

        adapter.log.debug("onLine: " + line);

        var al = reLine2.exec(line);
        switch(al[1] || al[3] || al[6]) {

            case 'TRAFFIC:':
                var msg = { opcode: CEC.CEC_OPCODE.NONE, args: {length: 0}, tokens: (al[2] || '').split(':') };
                if (msg.tokens && msg.tokens.length >= 1) {
                    msg.source = msg.tokens[0][0];
                    msg.target = msg.tokens[0][1];
                    msg.sourcei = parseInt(msg.source, 16);
                    msg.targeti = parseInt(msg.target, 16);
                    if (msg.tokens.length >= 2) {
                        msg.opcode = parseInt(msg.tokens[1], 16);
                        msg.args = msg.tokens.slice(2, msg.tokens.length + 1).map(function(hex) {
                            return parseInt(hex, 16);
                        });
                    }
                    return this.onMessage(msg);
                }
                break;

            case 'unable to open the d': //unable to open the device on port RPI
                adapter.log.error(line);
                adapter.log.error('Try to restart your raspberry with a connected HDMI cable.');
                break;

            case 'listing active devices': //if (line.indexOf('listing active devices:' == 0)) {
                if (g_initCount == 2) {
                    g_initCount = 3;
                }
                break;

            case 'device ':
                var id = x2d(line.substr(8, 1));
                //this.scanId = id;
                break;

            case 'CEC bus information': //if (line.indexOf('CEC bus information') == 0) {
                break;

            case 'waiting for input':
                adapter.log.debug('**** waiting for input');
                if (g_initCount === 0) {
                    g_initCount = 1; //have received our own logical address in onMessage.
                    setTimeout(listActiveDevices, 200);
                } else {
                    that.popWaitingForInput();
                }
                return true;

            case 'OSD name of device': // name {device} // "OSD name of device 0 is 'TV'"
                //var idold = x2d(line.substr(19, 1));
                var id = x2d(al[4]);
                //if (id !== idold) {
                //    adapter.log.debug('! ! ! ! ! ! ! ! OSD name of device id?')
                //}
                var name = line.slice(25, -1);
                cecDevices.setOSD(id, name);
                this.popOnLine('na');
                break;

            case 'power status': // power status: standby
                break;

            case 'logical address': // ad {device} // 'logical address 0 is active'
                //var idold = x2d(line.substr(16, 1));
                var id = x2d(al[4]);
                var active = (al[5] === '' || al[5] === 'is active');
                if (active) {
                    cecDevices.setActive(id, active);
                }
                if (al[5] === '') { // oder (g_initCount === 3)
                    if (ladTimer) return;
                    ladTimer = setTimeout(function() {
                        ladTimer = null;
                        that.popOnLine('la');
                    }, 500);
                } else {
                    this.popOnLine('ad');
                }
                break;
            default:
                return;
        }
    };

    return this;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var commonStates = {
    VOLUME_UP: 'common.vol-up',
    VOLUME_DOWN: 'common.vol-down',
    MUTE: 'common.mute',
    POWER: 'common.power',
    POWER_TV: 'common.tv-power',
    POWER_AUDIO: 'common.audio-power',
    ACTIVE_SOURCE: 'common.active-source',
    KEY_DOWN: 'common.key-down',
    KEY_UP: 'common.key-up',
    AUDIO_MODE: 'common.audio-mode',
    RAW_COMMAND: 'common.raw-command'
};

var cecCommandRexExp = /^[a-fA-F0-9]{2}(:[a-fA-F0-9]{2})*$/;
function stateChange(id, state) {

    if (id.indexOf(adapter.namespace) !== 0) return;
    id = id.substr(adapter.namespace.length + 1);

    var onoff = (state.val >> 0) ? 'on ' : 'standby ';
    switch (id) {
        case commonStates.VOLUME_UP:
            cec.send('volup');
            devices.rset(commonStates.VOLUME_UP, false);
            break;
        case commonStates.VOLUME_DOWN:
            cec.send('voldown');
            devices.rset(commonStates.VOLUME_DOWN, false);
            break;
        case commonStates.MUTE:
            cec.send('mute');
            //"tx 40 44 43"
            break;
        case commonStates.ACTIVE_SOURCE:
            if (state.val.length <= 1) {
                var val = val + '0:00';
            } else {
                var ar = state.val.split('.');
                if (ar.length < 4) return;
                var val = ar[0] + ar[1] + ':' + ar[2] + ar[3];
            }
            cec.send('tx 5f:82:' + val)
            //cec.send('as');
            break;
        case commonStates.RAW_COMMAND:
            if (cecCommandRexExp.test(state.val)) {
                cec.send("tx " + state.val);
            } else {
                cec.send(state.val);
            }
            break;

        case commonStates.POWER_TV:
            cec.send(onoff + '0');
            break;
        case commonStates.POWER_AUDIO:
            cec.send(onoff + '5');
            break;
        case commonStates.POWER:
            //cecDevices.forEach(cec.send, onoff + ' %s');
            /*
            15:44:40 power
            15:45 release useer controll

            15:44:6c off
            15:44:6d on


            10:36 standby one or all. Broadcast
            10:04 tv on
            */

            cec.send(onoff + 'f')
            break;
    }
}


function createRootObjects() {
    var l_dev = new devices.CDevice();
    for (var i in commonStates) {
        switch(commonStates[i]) {
            case commonStates.ACTIVE_SOURCE:
            case commonStates.RAW_COMMAND:
                l_dev.rset(commonStates[i], '');
                break;
            default:
                l_dev.rset(commonStates[i], false);
        }
    }
    l_dev.update();
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function main() {
    createRootObjects();

    cec = new NODECec();
    cec.start('-d 8 -t ' + orType + ' -o ' + orOSDName);

    adapter.subscribeStates('*');
}

//node --debug-brk cec.js --force
