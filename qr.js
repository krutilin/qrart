
//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//	http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//	http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

var qrcode = function() {

  //---------------------------------------------------------------------
  // qrcode
  //---------------------------------------------------------------------

  /**
   * qrcode
   * @param typeNumber 1 to 10
   * @param errorCorrectLevel 'L','M','Q','H'
   */
  var qrcode = function(typeNumber, errorCorrectLevel) {

    var PAD0 = 0xEC;
    var PAD1 = 0x11;

    var _typeNumber = typeNumber;
    var _errorCorrectLevel = QRErrorCorrectLevel[errorCorrectLevel];
    var _modules = null;
    var _moduleCount = 0;
    var _dataCache = null;
    var _dataList = new Array();

    var _this = {};

    var makeImpl = function(test, maskPattern, onlyControl) {

      onlyControl = onlyControl || false;
      _moduleCount = _typeNumber * 4 + 17;
      _modules = function(moduleCount) {
        var modules = new Array(moduleCount);
        for (var row = 0; row < moduleCount; row += 1) {
          modules[row] = new Array(moduleCount);
          for (var col = 0; col < moduleCount; col += 1) {
            modules[row][col] = null;
          }
        }
        return modules;
      }(_moduleCount);

      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);

      if (_typeNumber >= 7) {
        setupTypeNumber(test);
      }

      if (!onlyControl) {
        if (_dataCache == null) {
          _dataCache = createData(_typeNumber, _errorCorrectLevel, _dataList);
        }

        mapData(_dataCache, maskPattern);
      }
    };

    var setupPositionProbePattern = function(row, col) {

      for (var r = -1; r <= 7; r += 1) {

        if (row + r <= -1 || _moduleCount <= row + r) continue;

        for (var c = -1; c <= 7; c += 1) {

          if (col + c <= -1 || _moduleCount <= col + c) continue;

          if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
            || (0 <= c && c <= 6 && (r == 0 || r == 6) )
            || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
            _modules[row + r][col + c] = true;
          } else {
            _modules[row + r][col + c] = false;
          }
        }
      }
    };

    var getBestMaskPattern = function() {

      var minLostPoint = 0;
      var pattern = 0;

      for (var i = 0; i < 8; i += 1) {

        makeImpl(true, i);

        var lostPoint = QRUtil.getLostPoint(_this);

        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }

      return pattern;
    };

    var setupTimingPattern = function() {

      for (var r = 8; r < _moduleCount - 8; r += 1) {
        if (_modules[r][6] != null) {
          continue;
        }
        _modules[r][6] = (r % 2 == 0);
      }

      for (var c = 8; c < _moduleCount - 8; c += 1) {
        if (_modules[6][c] != null) {
          continue;
        }
        _modules[6][c] = (c % 2 == 0);
      }
    };

    var setupPositionAdjustPattern = function() {

      var pos = QRUtil.getPatternPosition(_typeNumber);

      for (var i = 0; i < pos.length; i += 1) {

        for (var j = 0; j < pos.length; j += 1) {

          var row = pos[i];
          var col = pos[j];

          if (_modules[row][col] != null) {
            continue;
          }

          for (var r = -2; r <= 2; r += 1) {

            for (var c = -2; c <= 2; c += 1) {

              if (r == -2 || r == 2 || c == -2 || c == 2
                || (r == 0 && c == 0) ) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    };

    var setupTypeNumber = function(test) {

      var bits = QRUtil.getBCHTypeNumber(_typeNumber);

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };

    var setupTypeInfo = function(test, maskPattern) {

      var data = (_errorCorrectLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);

      // vertical
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 6) {
          _modules[i][8] = mod;
        } else if (i < 8) {
          _modules[i + 1][8] = mod;
        } else {
          _modules[_moduleCount - 15 + i][8] = mod;
        }
      }

      // horizontal
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 8) {
          _modules[8][_moduleCount - i - 1] = mod;
        } else if (i < 9) {
          _modules[8][15 - i - 1 + 1] = mod;
        } else {
          _modules[8][15 - i - 1] = mod;
        }
      }

      // fixed module
      _modules[_moduleCount - 8][8] = (!test);
    };

    var mapData = function(data, maskPattern) {

      var inc = -1;
      var row = _moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = QRUtil.getMaskFunction(maskPattern);

      for (var col = _moduleCount - 1; col > 0; col -= 2) {

        if (col == 6) col -= 1;

        while (true) {

          for (var c = 0; c < 2; c += 1) {

            if (_modules[row][col - c] == null) {

              var dark = false;

              if (byteIndex < data.length) {
                dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
              }

              var mask = maskFunc(row, col - c);

              if (mask) {
                dark = !dark;
              }

              _modules[row][col - c] = dark;
              bitIndex -= 1;

              if (bitIndex == -1) {
                byteIndex += 1;
                bitIndex = 7;
              }
            }
          }

          row += inc;

          if (row < 0 || _moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    };

    var createBytes = function(buffer, rsBlocks) {

      var offset = 0;

      var maxDcCount = 0;
      var maxEcCount = 0;

      var dcdata = new Array(rsBlocks.length);
      var ecdata = new Array(rsBlocks.length);

      for (var r = 0; r < rsBlocks.length; r += 1) {

        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;

        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);

        dcdata[r] = new Array(dcCount);

        for (var i = 0; i < dcdata[r].length; i += 1) {
          dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
        }
        offset += dcCount;

        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (var i = 0; i < ecdata[r].length; i += 1) {
          var modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
        }
      }

      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalCodeCount += rsBlocks[i].totalCount;
      }

      var data = new Array(totalCodeCount);
      var index = 0;

      for (var i = 0; i < maxDcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < dcdata[r].length) {
            data[index] = dcdata[r][i];
            index += 1;
          }
        }
      }

      for (var i = 0; i < maxEcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < ecdata[r].length) {
            data[index] = ecdata[r][i];
            index += 1;
          }
        }
      }

      return data;
    };

    var createData = function(typeNumber, errorCorrectLevel, dataList) {

      var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);

      var buffer = qrBitBuffer();

      for (var i = 0; i < dataList.length; i += 1) {
        var data = dataList[i];
        buffer.put(data.getMode(), 4);
        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
        data.write(buffer);
      }

      // calc num max data.
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalDataCount += rsBlocks[i].dataCount;
      }

      if (buffer.getLengthInBits() > totalDataCount * 8) {
        throw new Error('code length overflow. ('
          + buffer.getLengthInBits()
          + '>'
          + totalDataCount * 8
          + ')');
      }

      // end code
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }

      // padding
      while (buffer.getLengthInBits() % 8 != 0) {
        buffer.putBit(false);
      }

      // padding
      while (true) {

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD0, 8);

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD1, 8);
      }

      return createBytes(buffer, rsBlocks);
    };

    _this.addData = function(data) {
      var newData = qr8BitByte(data);
      _dataList.push(newData);
      _dataCache = null;
    };

    _this.isDark = function(row, col) {
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
        throw new Error(row + ',' + col);
      }
      return _modules[row][col];
    };

    _this.getModuleCount = function() {
      return _moduleCount;
    };

    _this.make = function(onlyControl) {
      makeImpl(false, getBestMaskPattern(), onlyControl);
    };

    _this.createTableTag = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var qrHtml = '';

      qrHtml += '<table style="';
      qrHtml += ' border-width: 0px; border-style: none;';
      qrHtml += ' border-collapse: collapse;';
      qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
      qrHtml += '">';
      qrHtml += '<tbody>';

      for (var r = 0; r < _this.getModuleCount(); r += 1) {

        qrHtml += '<tr>';

        for (var c = 0; c < _this.getModuleCount(); c += 1) {
          qrHtml += '<td style="';
          qrHtml += ' border-width: 0px; border-style: none;';
          qrHtml += ' border-collapse: collapse;';
          qrHtml += ' padding: 0px; margin: 0px;';
          qrHtml += ' width: ' + cellSize + 'px;';
          qrHtml += ' height: ' + cellSize + 'px;';
          qrHtml += ' background-color: ';
          qrHtml += _this.isDark(r, c)? '#000000' : '#ffffff';
          qrHtml += ';';
          qrHtml += '"/>';
        }

        qrHtml += '</tr>';
      }

      qrHtml += '</tbody>';
      qrHtml += '</table>';

      return qrHtml;
    };

    _this.returnByteArray = function() {

      return _modules;
    }

    _this.createImgTag = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      return createImgTag(size, size, function(x, y) {
        if (min <= x && x < max && min <= y && y < max) {
          var c = Math.floor( (x - min) / cellSize);
          var r = Math.floor( (y - min) / cellSize);
          return _this.isDark(r, c)? 0 : 1;
        } else {
          return 1;
        }
      } );
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrcode.stringToBytes
  //---------------------------------------------------------------------

  qrcode.stringToBytes = function(s) {
    var bytes = new Array();
    for (var i = 0; i < s.length; i += 1) {
      var c = s.charCodeAt(i);
      bytes.push(c & 0xff);
    }
    return bytes;
  };

  //---------------------------------------------------------------------
  // qrcode.createStringToBytes
  //---------------------------------------------------------------------

  /**
   * @param unicodeData base64 string of byte array.
   * [16bit Unicode],[16bit Bytes], ...
   * @param numChars
   */
  qrcode.createStringToBytes = function(unicodeData, numChars) {

    // create conversion map.

    var unicodeMap = function() {

      var bin = base64DecodeInputStream(unicodeData);
      var read = function() {
        var b = bin.read();
        if (b == -1) throw new Error();
        return b;
      };

      var count = 0;
      var unicodeMap = {};
      while (true) {
        var b0 = bin.read();
        if (b0 == -1) break;
        var b1 = read();
        var b2 = read();
        var b3 = read();
        var k = String.fromCharCode( (b0 << 8) | b1);
        var v = (b2 << 8) | b3;
        unicodeMap[k] = v;
        count += 1;
      }
      if (count != numChars) {
        throw new Error(count + ' != ' + numChars);
      }

      return unicodeMap;
    }();

    var unknownChar = '?'.charCodeAt(0);

    return function(s) {
      var bytes = new Array();
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        if (c < 128) {
          bytes.push(c);
        } else {
          var b = unicodeMap[s.charAt(i)];
          if (typeof b == 'number') {
            if ( (b & 0xff) == b) {
              // 1byte
              bytes.push(b);
            } else {
              // 2bytes
              bytes.push(b >>> 8);
              bytes.push(b & 0xff);
            }
          } else {
            bytes.push(unknownChar);
          }
        }
      }
      return bytes;
    };
  };

  //---------------------------------------------------------------------
  // QRMode
  //---------------------------------------------------------------------

  var QRMode = {
    MODE_NUMBER :		1 << 0,
    MODE_ALPHA_NUM : 	1 << 1,
    MODE_8BIT_BYTE : 	1 << 2,
    MODE_KANJI :		1 << 3
  };
  qrcode.QRMode = QRMode;

  //---------------------------------------------------------------------
  // QRErrorCorrectLevel
  //---------------------------------------------------------------------

  var QRErrorCorrectLevel = {
    L : 1,
    M : 0,
    Q : 3,
    H : 2
  };
  qrcode.QRErrorCorrectLevel = QRErrorCorrectLevel;

  //---------------------------------------------------------------------
  // QRMaskPattern
  //---------------------------------------------------------------------

  var QRMaskPattern = {
    PATTERN000 : 0,
    PATTERN001 : 1,
    PATTERN010 : 2,
    PATTERN011 : 3,
    PATTERN100 : 4,
    PATTERN101 : 5,
    PATTERN110 : 6,
    PATTERN111 : 7
  };
  qrcode.QRMaskPattern = QRMaskPattern;

  //---------------------------------------------------------------------
  // QRUtil
  //---------------------------------------------------------------------

  var QRUtil = function() {

    var PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ];
    var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

    var _this = {};

    var getBCHDigit = function(data) {
      var digit = 0;
      while (data != 0) {
        digit += 1;
        data >>>= 1;
      }
      return digit;
    };

    _this.getBCHTypeInfo = function(data) {
      var d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
        d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
      }
      return ( (data << 10) | d) ^ G15_MASK;
    };

    _this.getBCHTypeNumber = function(data) {
      var d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
        d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
      }
      return (data << 12) | d;
    };

    _this.getPatternPosition = function(typeNumber) {
      return PATTERN_POSITION_TABLE[typeNumber - 1];
    };

    _this.getMaskFunction = function(maskPattern) {

      switch (maskPattern) {

        case QRMaskPattern.PATTERN000 :
          return function(i, j) { return (i + j) % 2 == 0; };
        case QRMaskPattern.PATTERN001 :
          return function(i, j) { return i % 2 == 0; };
        case QRMaskPattern.PATTERN010 :
          return function(i, j) { return j % 3 == 0; };
        case QRMaskPattern.PATTERN011 :
          return function(i, j) { return (i + j) % 3 == 0; };
        case QRMaskPattern.PATTERN100 :
          return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
        case QRMaskPattern.PATTERN101 :
          return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
        case QRMaskPattern.PATTERN110 :
          return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
        case QRMaskPattern.PATTERN111 :
          return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

        default :
          throw new Error('bad maskPattern:' + maskPattern);
      }
    };

    _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
      var a = qrPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i += 1) {
        a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
      }
      return a;
    };

    _this.getLengthInBits = function(mode, type) {

      if (1 <= type && type < 10) {

        // 1 - 9

        switch(mode) {
          case QRMode.MODE_NUMBER 	: return 10;
          case QRMode.MODE_ALPHA_NUM 	: return 9;
          case QRMode.MODE_8BIT_BYTE	: return 8;
          case QRMode.MODE_KANJI		: return 8;
          default :
            throw new Error('mode:' + mode);
        }

      } else if (type < 27) {

        // 10 - 26

        switch(mode) {
          case QRMode.MODE_NUMBER 	: return 12;
          case QRMode.MODE_ALPHA_NUM 	: return 11;
          case QRMode.MODE_8BIT_BYTE	: return 16;
          case QRMode.MODE_KANJI		: return 10;
          default :
            throw new Error('mode:' + mode);
        }

      } else if (type < 41) {

        // 27 - 40

        switch(mode) {
          case QRMode.MODE_NUMBER 	: return 14;
          case QRMode.MODE_ALPHA_NUM	: return 13;
          case QRMode.MODE_8BIT_BYTE	: return 16;
          case QRMode.MODE_KANJI		: return 12;
          default :
            throw new Error('mode:' + mode);
        }

      } else {
        throw new Error('type:' + type);
      }
    };

    _this.getLostPoint = function(qrcode) {

      var moduleCount = qrcode.getModuleCount();

      var lostPoint = 0;

      // LEVEL1

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount; col += 1) {

          var sameCount = 0;
          var dark = qrcode.isDark(row, col);

          for (var r = -1; r <= 1; r += 1) {

            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }

            for (var c = -1; c <= 1; c += 1) {

              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }

              if (r == 0 && c == 0) {
                continue;
              }

              if (dark == qrcode.isDark(row + r, col + c) ) {
                sameCount += 1;
              }
            }
          }

          if (sameCount > 5) {
            lostPoint += (3 + sameCount - 5);
          }
        }
      };

      // LEVEL2

      for (var row = 0; row < moduleCount - 1; row += 1) {
        for (var col = 0; col < moduleCount - 1; col += 1) {
          var count = 0;
          if (qrcode.isDark(row, col) ) count += 1;
          if (qrcode.isDark(row + 1, col) ) count += 1;
          if (qrcode.isDark(row, col + 1) ) count += 1;
          if (qrcode.isDark(row + 1, col + 1) ) count += 1;
          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }

      // LEVEL3

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount - 6; col += 1) {
          if (qrcode.isDark(row, col)
            && !qrcode.isDark(row, col + 1)
            &&  qrcode.isDark(row, col + 2)
            &&  qrcode.isDark(row, col + 3)
            &&  qrcode.isDark(row, col + 4)
            && !qrcode.isDark(row, col + 5)
            &&  qrcode.isDark(row, col + 6) ) {
            lostPoint += 40;
          }
        }
      }

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount - 6; row += 1) {
          if (qrcode.isDark(row, col)
            && !qrcode.isDark(row + 1, col)
            &&  qrcode.isDark(row + 2, col)
            &&  qrcode.isDark(row + 3, col)
            &&  qrcode.isDark(row + 4, col)
            && !qrcode.isDark(row + 5, col)
            &&  qrcode.isDark(row + 6, col) ) {
            lostPoint += 40;
          }
        }
      }

      // LEVEL4

      var darkCount = 0;

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount; row += 1) {
          if (qrcode.isDark(row, col) ) {
            darkCount += 1;
          }
        }
      }

      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;

      return lostPoint;
    };

    return _this;
  }();
  qrcode.QRUtil = QRUtil;

  //---------------------------------------------------------------------
  // QRMath
  //---------------------------------------------------------------------

  var QRMath = function() {

    var EXP_TABLE = new Array(256);
    var LOG_TABLE = new Array(256);

    // initialize tables
    for (var i = 0; i < 8; i += 1) {
      EXP_TABLE[i] = 1 << i;
    }
    for (var i = 8; i < 256; i += 1) {
      EXP_TABLE[i] = EXP_TABLE[i - 4]
        ^ EXP_TABLE[i - 5]
        ^ EXP_TABLE[i - 6]
        ^ EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i += 1) {
      LOG_TABLE[EXP_TABLE[i] ] = i;
    }

    var _this = {};

    _this.glog = function(n) {

      if (n < 1) {
        throw new Error('glog(' + n + ')');
      }

      return LOG_TABLE[n];
    };

    _this.gexp = function(n) {

      while (n < 0) {
        n += 255;
      }

      while (n >= 256) {
        n -= 255;
      }

      return EXP_TABLE[n];
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrPolynomial
  //---------------------------------------------------------------------

  function qrPolynomial(num, shift) {

    if (typeof num.length == 'undefined') {
      throw new Error(num.length + '/' + shift);
    }

    var _num = function() {
      var offset = 0;
      while (offset < num.length && num[offset] == 0) {
        offset += 1;
      }
      var _num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i += 1) {
        _num[i] = num[i + offset];
      }
      return _num;
    }();

    var _this = {};

    _this.getAt = function(index) {
      return _num[index];
    };

    _this.getLength = function() {
      return _num.length;
    };

    _this.multiply = function(e) {

      var num = new Array(_this.getLength() + e.getLength() - 1);

      for (var i = 0; i < _this.getLength(); i += 1) {
        for (var j = 0; j < e.getLength(); j += 1) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
        }
      }

      return qrPolynomial(num, 0);
    };

    _this.mod = function(e) {

      if (_this.getLength() - e.getLength() < 0) {
        return _this;
      }

      var ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

      var num = new Array(_this.getLength() );
      for (var i = 0; i < _this.getLength(); i += 1) {
        num[i] = _this.getAt(i);
      }

      for (var i = 0; i < e.getLength(); i += 1) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
      }

      // recursive call
      return qrPolynomial(num, 0).mod(e);
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // QRRSBlock
  //---------------------------------------------------------------------

  var QRRSBlock = function() {

    var _this = {};

    var RS_BLOCK_TABLE = [

      // L
      // M
      // Q
      // H

      // 1
      [1, 26, 19],
      [1, 26, 16],
      [1, 26, 13],
      [1, 26, 9],

      // 2
      [1, 44, 34],
      [1, 44, 28],
      [1, 44, 22],
      [1, 44, 16],

      // 3
      [1, 70, 55],
      [1, 70, 44],
      [2, 35, 17],
      [2, 35, 13],

      // 4
      [1, 100, 80],
      [2, 50, 32],
      [2, 50, 24],
      [4, 25, 9],

      // 5
      [1, 134, 108],
      [2, 67, 43],
      [2, 33, 15, 2, 34, 16],
      [2, 33, 11, 2, 34, 12],

      // 6
      [2, 86, 68],
      [4, 43, 27],
      [4, 43, 19],
      [4, 43, 15],

      // 7
      [2, 98, 78],
      [4, 49, 31],
      [2, 32, 14, 4, 33, 15],
      [4, 39, 13, 1, 40, 14],

      // 8
      [2, 121, 97],
      [2, 60, 38, 2, 61, 39],
      [4, 40, 18, 2, 41, 19],
      [4, 40, 14, 2, 41, 15],

      // 9
      [2, 146, 116],
      [3, 58, 36, 2, 59, 37],
      [4, 36, 16, 4, 37, 17],
      [4, 36, 12, 4, 37, 13],

      // 10
      [2, 86, 68, 2, 87, 69],
      [4, 69, 43, 1, 70, 44],
      [6, 43, 19, 2, 44, 20],
      [6, 43, 15, 2, 44, 16]
    ];
    _this.RS_BLOCK_TABLE = RS_BLOCK_TABLE;

    var qrRSBlock = function(totalCount, dataCount) {
      var _this = {};
      _this.totalCount = totalCount;
      _this.dataCount = dataCount;
      return _this;
    };

    var getRsBlockTable = function(typeNumber, errorCorrectLevel) {

      switch(errorCorrectLevel) {
        case QRErrorCorrectLevel.L :
          return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
        case QRErrorCorrectLevel.M :
          return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
        case QRErrorCorrectLevel.Q :
          return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
        case QRErrorCorrectLevel.H :
          return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
        default :
          return undefined;
      }
    };

    _this.getRSBlocks = function(typeNumber, errorCorrectLevel) {

      var rsBlock = getRsBlockTable(typeNumber, errorCorrectLevel);

      if (typeof rsBlock == 'undefined') {
        throw new Error('bad rs block @ typeNumber:' + typeNumber +
          '/errorCorrectLevel:' + errorCorrectLevel);
      }

      var length = rsBlock.length / 3;

      var list = new Array();

      for (var i = 0; i < length; i += 1) {

        var count = rsBlock[i * 3 + 0];
        var totalCount = rsBlock[i * 3 + 1];
        var dataCount = rsBlock[i * 3 + 2];

        for (var j = 0; j < count; j += 1) {
          list.push(qrRSBlock(totalCount, dataCount) );
        }
      }

      return list;
    };

    return _this;
  }();
  qrcode.QRRSBlock = QRRSBlock;

  //---------------------------------------------------------------------
  // qrBitBuffer
  //---------------------------------------------------------------------

  var qrBitBuffer = function() {

    var _buffer = new Array();
    var _length = 0;

    var _this = {};

    _this.getBuffer = function() {
      return _buffer;
    };

    _this.getAt = function(index) {
      var bufIndex = Math.floor(index / 8);
      return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
    };

    _this.put = function(num, length) {
      for (var i = 0; i < length; i += 1) {
        _this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
      }
    };

    _this.getLengthInBits = function() {
      return _length;
    };

    _this.putBit = function(bit) {

      var bufIndex = Math.floor(_length / 8);
      if (_buffer.length <= bufIndex) {
        _buffer.push(0);
      }

      if (bit) {
        _buffer[bufIndex] |= (0x80 >>> (_length % 8) );
      }

      _length += 1;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qr8BitByte
  //---------------------------------------------------------------------

  var qr8BitByte = function(data) {

    var _mode = QRMode.MODE_8BIT_BYTE;
    var _data = data;
    var _bytes = qrcode.stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _bytes.length;
    };

    _this.write = function(buffer) {
      for (var i = 0; i < _bytes.length; i += 1) {
        buffer.put(_bytes[i], 8);
      }
    };

    return _this;
  };

  //=====================================================================
  // GIF Support etc.
  //

  //---------------------------------------------------------------------
  // byteArrayOutputStream
  //---------------------------------------------------------------------

  var byteArrayOutputStream = function() {

    var _bytes = new Array();

    var _this = {};

    _this.writeByte = function(b) {
      _bytes.push(b & 0xff);
    };

    _this.writeShort = function(i) {
      _this.writeByte(i);
      _this.writeByte(i >>> 8);
    };

    _this.writeBytes = function(b, off, len) {
      off = off || 0;
      len = len || b.length;
      for (var i = 0; i < len; i += 1) {
        _this.writeByte(b[i + off]);
      }
    };

    _this.writeString = function(s) {
      for (var i = 0; i < s.length; i += 1) {
        _this.writeByte(s.charCodeAt(i) );
      }
    };

    _this.toByteArray = function() {
      return _bytes;
    };

    _this.toString = function() {
      var s = '';
      s += '[';
      for (var i = 0; i < _bytes.length; i += 1) {
        if (i > 0) {
          s += ',';
        }
        s += _bytes[i];
      }
      s += ']';
      return s;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64EncodeOutputStream
  //---------------------------------------------------------------------

  var base64EncodeOutputStream = function() {

    var _buffer = 0;
    var _buflen = 0;
    var _length = 0;
    var _base64 = '';

    var _this = {};

    var writeEncoded = function(b) {
      _base64 += String.fromCharCode(encode(b & 0x3f) );
    };

    var encode = function(n) {
      if (n < 0) {
        // error.
      } else if (n < 26) {
        return 0x41 + n;
      } else if (n < 52) {
        return 0x61 + (n - 26);
      } else if (n < 62) {
        return 0x30 + (n - 52);
      } else if (n == 62) {
        return 0x2b;
      } else if (n == 63) {
        return 0x2f;
      }
      throw new Error('n:' + n);
    };

    _this.writeByte = function(n) {

      _buffer = (_buffer << 8) | (n & 0xff);
      _buflen += 8;
      _length += 1;

      while (_buflen >= 6) {
        writeEncoded(_buffer >>> (_buflen - 6) );
        _buflen -= 6;
      }
    };

    _this.flush = function() {

      if (_buflen > 0) {
        writeEncoded(_buffer << (6 - _buflen) );
        _buffer = 0;
        _buflen = 0;
      }

      if (_length % 3 != 0) {
        // padding
        var padlen = 3 - _length % 3;
        for (var i = 0; i < padlen; i += 1) {
          _base64 += '=';
        }
      }
    };

    _this.toString = function() {
      return _base64;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64DecodeInputStream
  //---------------------------------------------------------------------

  var base64DecodeInputStream = function(str) {

    var _str = str;
    var _pos = 0;
    var _buffer = 0;
    var _buflen = 0;

    var _this = {};

    _this.read = function() {

      while (_buflen < 8) {

        if (_pos >= _str.length) {
          if (_buflen == 0) {
            return -1;
          }
          throw new Error('unexpected end of file./' + _buflen);
        }

        var c = _str.charAt(_pos);
        _pos += 1;

        if (c == '=') {
          _buflen = 0;
          return -1;
        } else if (c.match(/^\s$/) ) {
          // ignore if whitespace.
          continue;
        }

        _buffer = (_buffer << 6) | decode(c.charCodeAt(0) );
        _buflen += 6;
      }

      var n = (_buffer >>> (_buflen - 8) ) & 0xff;
      _buflen -= 8;
      return n;
    };

    var decode = function(c) {
      if (0x41 <= c && c <= 0x5a) {
        return c - 0x41;
      } else if (0x61 <= c && c <= 0x7a) {
        return c - 0x61 + 26;
      } else if (0x30 <= c && c <= 0x39) {
        return c - 0x30 + 52;
      } else if (c == 0x2b) {
        return 62;
      } else if (c == 0x2f) {
        return 63;
      } else {
        throw new Error('c:' + c);
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // gifImage (B/W)
  //---------------------------------------------------------------------

  var gifImage = function(width, height) {

    var _width = width;
    var _height = height;
    var _data = new Array(width * height);

    var _this = {};

    _this.setPixel = function(x, y, pixel) {
      _data[y * _width + x] = pixel;
    };

    _this.write = function(out) {

      //---------------------------------
      // GIF Signature

      out.writeString('GIF87a');

      //---------------------------------
      // Screen Descriptor

      out.writeShort(_width);
      out.writeShort(_height);

      out.writeByte(0x80); // 2bit
      out.writeByte(0);
      out.writeByte(0);

      //---------------------------------
      // Global Color Map

      // black
      out.writeByte(0x00);
      out.writeByte(0x00);
      out.writeByte(0x00);

      // white
      out.writeByte(0xff);
      out.writeByte(0xff);
      out.writeByte(0xff);

      //---------------------------------
      // Image Descriptor

      out.writeString(',');
      out.writeShort(0);
      out.writeShort(0);
      out.writeShort(_width);
      out.writeShort(_height);
      out.writeByte(0);

      //---------------------------------
      // Local Color Map

      //---------------------------------
      // Raster Data

      var lzwMinCodeSize = 2;
      var raster = getLZWRaster(lzwMinCodeSize);

      out.writeByte(lzwMinCodeSize);

      var offset = 0;

      while (raster.length - offset > 255) {
        out.writeByte(255);
        out.writeBytes(raster, offset, 255);
        offset += 255;
      }

      out.writeByte(raster.length - offset);
      out.writeBytes(raster, offset, raster.length - offset);
      out.writeByte(0x00);

      //---------------------------------
      // GIF Terminator
      out.writeString(';');
    };

    var bitOutputStream = function(out) {

      var _out = out;
      var _bitLength = 0;
      var _bitBuffer = 0;

      var _this = {};

      _this.write = function(data, length) {

        if ( (data >>> length) != 0) {
          throw new Error('length over');
        }

        while (_bitLength + length >= 8) {
          _out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
          length -= (8 - _bitLength);
          data >>>= (8 - _bitLength);
          _bitBuffer = 0;
          _bitLength = 0;
        }

        _bitBuffer = (data << _bitLength) | _bitBuffer;
        _bitLength = _bitLength + length;
      };

      _this.flush = function() {
        if (_bitLength > 0) {
          _out.writeByte(_bitBuffer);
        }
      };

      return _this;
    };

    var getLZWRaster = function(lzwMinCodeSize) {

      var clearCode = 1 << lzwMinCodeSize;
      var endCode = (1 << lzwMinCodeSize) + 1;
      var bitLength = lzwMinCodeSize + 1;

      // Setup LZWTable
      var table = lzwTable();

      for (var i = 0; i < clearCode; i += 1) {
        table.add(String.fromCharCode(i) );
      }
      table.add(String.fromCharCode(clearCode) );
      table.add(String.fromCharCode(endCode) );

      var byteOut = byteArrayOutputStream();
      var bitOut = bitOutputStream(byteOut);

      // clear code
      bitOut.write(clearCode, bitLength);

      var dataIndex = 0;

      var s = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;

      while (dataIndex < _data.length) {

        var c = String.fromCharCode(_data[dataIndex]);
        dataIndex += 1;

        if (table.contains(s + c) ) {

          s = s + c;

        } else {

          bitOut.write(table.indexOf(s), bitLength);

          if (table.size() < 0xfff) {

            if (table.size() == (1 << bitLength) ) {
              bitLength += 1;
            }

            table.add(s + c);
          }

          s = c;
        }
      }

      bitOut.write(table.indexOf(s), bitLength);

      // end code
      bitOut.write(endCode, bitLength);

      bitOut.flush();

      return byteOut.toByteArray();
    };

    var lzwTable = function() {

      var _map = {};
      var _size = 0;

      var _this = {};

      _this.add = function(key) {
        if (_this.contains(key) ) {
          throw new Error('dup key:' + key);
        }
        _map[key] = _size;
        _size += 1;
      };

      _this.size = function() {
        return _size;
      };

      _this.indexOf = function(key) {
        return _map[key];
      };

      _this.contains = function(key) {
        return typeof _map[key] != 'undefined';
      };

      return _this;
    };

    return _this;
  };

  var createImgTag = function(width, height, getPixel, alt) {

    var gif = gifImage(width, height);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        gif.setPixel(x, y, getPixel(x, y) );
      }
    }

    var b = byteArrayOutputStream();
    gif.write(b);

    var base64 = base64EncodeOutputStream();
    var bytes = b.toByteArray();
    for (var i = 0; i < bytes.length; i += 1) {
      base64.writeByte(bytes[i]);
    }
    base64.flush();

    var img = '';
    img += '<img';
    img += '\u0020src="';
    img += 'data:image/gif;base64,';
    img += base64;
    img += '"';
    img += '\u0020width="';
    img += width;
    img += '"';
    img += '\u0020height="';
    img += height;
    img += '"';
    if (alt) {
      img += '\u0020alt="';
      img += alt;
      img += '"';
    }
    img += '/>';

    return img;
  };

  //---------------------------------------------------------------------
  // returns qrcode function.

  return qrcode;
}();






var pixelSize = 2;
var blockSize = (3*pixelSize);
var image;
var has_image = false;

function halftoneQR(QRBytes, controlBytes, image) {

  var canvas = $('#output').get(0);
  canvas.width = canvas.height = QRBytes.length * (3*pixelSize);
  var ctx = canvas.getContext('2d');
  var background = $('#background').val();

  $('#imageColour, #imageThreshold, #imagePixel').attr({
    width: canvas.width,
    height: canvas.height
  });
  if (has_image) {
    // Re-draw image (incase size changed)
    drawImage();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  var canvasThreshold = $('#imageThreshold').get(0);
  var ctxThreshold = canvasThreshold.getContext('2d');

  if (has_image && background === 'image') {
    ctx.drawImage(canvasThreshold, 0, 0, canvas.width, canvas.height);
  }

  for (var byteRow = 0; byteRow < QRBytes.length; byteRow++) {
    for (var byteCell = 0; byteCell < QRBytes[byteRow].length; byteCell++) {

      if ((background === 'image' && !has_image) || background === 'noise') {
        // Draw random bytes
        ctx.fillStyle = 'black';
        for (var subRow = 0; subRow < 3; subRow++) {
          for (var subCell = 0; subCell < 3; subCell++) {
            ctx.fillStyle = 'black';
            if (Math.random() < 0.5) {
              ctx.fillStyle = 'white';
            }
            ctx.fillRect(byteRow * blockSize + (subRow * pixelSize), byteCell * blockSize + (subCell * pixelSize), pixelSize, pixelSize);
          }
        }
      }

      // Middle Cell
      ctx.fillStyle = QRBytes[byteRow][byteCell] ? 'black' : 'white';
      ctx.fillRect(byteRow * blockSize + pixelSize, byteCell * blockSize + pixelSize, pixelSize, pixelSize);
    }
  }

  // Re-draw control bytes
  for (var byteRow = 0; byteRow < controlBytes.length; byteRow++) {
    for (var byteCell = 0; byteCell < controlBytes[byteRow].length; byteCell++) {
      if (controlBytes[byteRow][byteCell] !== null) {
        if (controlBytes[byteRow][byteCell] === true) {
          ctx.fillStyle = 'black';
        } else {
          ctx.fillStyle = 'white';
        }
        ctx.fillRect(byteRow * blockSize, byteCell * blockSize, blockSize, blockSize);
      }
    };
  };

  $('#download').attr('href', $('#output').get(0).toDataURL());

}

function drawImage() {
  var canvasColour = $('#imageColour').get(0);
  var ctxColour = canvasColour.getContext('2d');

  ctxColour.clearRect(0,0,canvasColour.width, canvasColour.height);
  ctxColour.drawImage(image, 0, 0, canvasColour.width, canvasColour.height);

  drawPixel();
}

function drawPixel() {
  var canvasColour = $('#imageColour').get(0);
  var canvasPixel = $('#imagePixel').get(0);
  var ctxPixel = canvasPixel.getContext('2d');
  var canvasTemp = document.createElement('canvas');
  canvasTemp.width = canvasTemp.height = (canvasPixel.width / pixelSize);
  var ctxTemp = canvasTemp.getContext('2d');

  ctxPixel.imageSmoothingEnabled =
    ctxPixel.mozImageSmoothingEnabled =
      ctxPixel.msImageSmoothingEnabled =
        ctxPixel.webkitImageSmoothingEnabled =
          ctxTemp.imageSmoothingEnabled =
            ctxTemp.mozImageSmoothingEnabled =
              ctxTemp.msImageSmoothingEnabled =
                ctxTemp.webkitImageSmoothingEnabled = false;

  ctxTemp.drawImage(canvasColour, 0, 0, canvasTemp.width, canvasTemp.height);
  ctxPixel.drawImage(canvasTemp, 0, 0, canvasPixel.width, canvasPixel.height);

  drawThreshold();
}

function drawThreshold() {
  var canvasPixel = $('#imagePixel').get(0);
  var ctxPixel = canvasPixel.getContext('2d');
  var canvasThreshold = $('#imageThreshold').get(0);
  var ctxThreshold = canvasThreshold.getContext('2d');

  var pixels = ctxPixel.getImageData(0,0,canvasPixel.width,canvasPixel.height);
  var d = pixels.data;
  var width = Math.sqrt(d.length / 4) / pixelSize;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    var grey = (r * 0.2126 + g * 0.7152 + b * 0.0722);
    //var v = (grey >= 127) ? 255 : 0;
    //d[i] = d[i+1] = d[i+2] = v;
    d[i] = d[i+1] = d[i+2] = grey;
  }

  for (var i=0; i<d.length; i+=4) {
    var grey = d[i];
    var v = (grey >= 127) ? 255 : 0;

    // Dithering
    var error = (grey - v) / 8;
    var i2 = i / 4;
    var row = Math.floor(i2 / width);
    var cell = i2 % width;

    d[i] = d[i+1] = d[i+2] = v;

    d[(((row + 0) * width) + (cell + 1)) * 4] = d[(((row + 0) * width) + (cell + 1)) * 4 + 1] = d[(((row + 0) * width) + (cell + 1)) * 4 + 2] = d[(((row + 0) * width) + (cell + 1)) * 4] + error;
    d[(((row + 0) * width) + (cell + 2)) * 4] = d[(((row + 0) * width) + (cell + 2)) * 4 + 1] = d[(((row + 0) * width) + (cell + 2)) * 4 + 2] = d[(((row + 0) * width) + (cell + 2)) * 4] + error;
    d[(((row + 1) * width) + (cell - 1)) * 4] = d[(((row + 1) * width) + (cell - 1)) * 4 + 1] = d[(((row + 1) * width) + (cell - 1)) * 4 + 2] = d[(((row + 1) * width) + (cell - 1)) * 4] + error;
    d[(((row + 1) * width) + (cell + 0)) * 4] = d[(((row + 1) * width) + (cell + 0)) * 4 + 1] = d[(((row + 1) * width) + (cell + 0)) * 4 + 2] = d[(((row + 1) * width) + (cell + 0)) * 4] + error;
    d[(((row + 1) * width) + (cell + 1)) * 4] = d[(((row + 1) * width) + (cell + 1)) * 4 + 1] = d[(((row + 1) * width) + (cell + 1)) * 4 + 2] = d[(((row + 1) * width) + (cell + 1)) * 4] + error;
    d[(((row + 2) * width) + (cell + 0)) * 4] = d[(((row + 2) * width) + (cell + 0)) * 4 + 1] = d[(((row + 2) * width) + (cell + 0)) * 4 + 2] = d[(((row + 2) * width) + (cell + 0)) * 4] + error;
  }
  ctxThreshold.putImageData(pixels, 0, 0);
}

$('body').on('dragover', function(e) {
  e.preventDefault();
  $('body').addClass('hover');
});
$('#overlay').on('dragend dragleave', function(e) {
  e.preventDefault();
  $('body').removeClass('hover');
});
$('#overlay').on('drop', function(e) {
  e.preventDefault();
  $('body').removeClass('hover');

  var file = e.originalEvent.dataTransfer.files[0],
    reader = new FileReader();
  reader.onload = function(event) {
    //event.target.result;
    var imageColour = new Image();
    imageColour.onload = function() {
      has_image = true;
      image = this;
      drawImage();
    }
    imageColour.src = event.target.result;
  };
  reader.readAsDataURL(file);

  return false;
});

$(function() {

  $('#go').on('click', function() {
    var text = $('#input').val();

    var errorLevel = $('#error_level').val();

    var sizes = {
      L: [152, 272, 440, 640, 864, 1088, 1248, 1552, 1856, 1240],
      M: [128, 224, 352, 512, 688, 864,  992,  700,  700,  524],
      Q: [104, 176, 272, 384, 286, 608,  508,  376,  608,  434],
      H: [72,  128, 208, 288, 214, 480,  164,  296,  464,  346]
    };

    var userSize = parseInt($('#size').val());
    var QRsize = -1;
    if (userSize === 0) {
      for (var i = 0; i < sizes[errorLevel].length; i++) {
        if (text.length < sizes[errorLevel][i]) {
          QRsize = i + 1;
          break;
        }
      };
    } else {
      if (text.length < sizes[errorLevel][userSize - 1]) {
        QRsize = userSize;
      }
    }
    if (QRsize == -1) {
      if (userSize === 0) {
        if (errorLevel === 'H') {
          alert('Too much text.');
        } else {
          alert('Too much text. Try decreasing the error level.');
        }
      } else {
        alert('Too much text. Try decreasing the error level or increasing the size.');
      }
      return;
    }

    var qr = qrcode(QRsize, errorLevel);
    qr.addData(text);
    qr.make();

    var controls = qrcode(QRsize, errorLevel);
    controls.addData(text);
    controls.make(true);

    halftoneQR(qr.returnByteArray(), controls.returnByteArray());

  });

  // First load (cat)
  var imageColour = new Image();
  imageColour.onload = function() {
    has_image = true;
    image = this;
    $('#go').triggerHandler('click');
  }
  imageColour.src = 'data:image/jpeg;base64,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';

});