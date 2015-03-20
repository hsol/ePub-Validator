// Ridibooks-Checker 0.0.1
'use strict';

var ps       = process,
    log      = require('./lib/Log'),
    report   = require('./lib/Report'),
    fs       = require('fs'),
    path     = require('path'),
    uuid     = require('node-uuid'),
    pkg      = require(path.join(__dirname, 'package.json')),
    cmd      = require('commander'),
    rimraf   = require('rimraf'), /*폴더 삭제용*/
    Zip      = require('adm-zip'),
    Epub     = require('./lib/EPubValidator'),
    File     = require('./lib/FileValidator'),
    config   = require('./lib/Config'),
    humanize = require('ms'),
    debug    = require('debug')('app');

var temp = 'epub-validator-temp';
var unzipPath = path.join(temp, uuid.v1());

var startTime = new Date();

var exit = function(/*Number*/code, /*Object*/e) {
  if (e !== undefined) {
    if (e.code === undefined) {
      console.log(e);
    } else {
      report.add(e.code, e.location, e.msgArgs, e.descArgs, e.sugArgs);
    }
  }

  try {
    rimraf.sync(unzipPath);
  } catch(e) {
    report.add('APP-201'/*임시 폴더 삭제 오류*/, null, [unzipPath]);
    console.log(e);
  }

  var finishTime = new Date();
  var ms = finishTime - startTime;

  report.add(code ? 'APP-102'/*검사 중지*/ : 'APP-103'/*검사 완료*/, null, [file || '', humanize(ms)]);

  report.print();

  debug('exit');
  ps.exit(code);
};

// TODO: 추후 옵션을 추가하거나 사용법을 구체적으로 추가해보자
cmd.version(pkg.name + ' v' + pkg.version)
   .usage('<file>')
   .parse(ps.argv);

debug('init');

var file = cmd.args[0];
if (file === undefined) {
  report.add('APP-401'/*파라메터 부족*/);
  exit(1);
}

debug('check args');

if (fs.existsSync(file) === false) {
  report.add('APP-402'/*검사 대상을 찾을 수 없음*/, null, [file]);
  exit(2);
}

report.add('APP-101'/*검사 시작*/, null, [file]);

debug('check exists file');

try {
  var zip = new Zip(file);
  zip.extractAllTo(unzipPath, true);
} catch(e) {
  report.add('APP-403'/*압축해제 오류*/, null, [file]);
  exit(3, e);
}

debug('ePub uncompressed');

try {
  var epub = new Epub(file, unzipPath);
  epub.validation();
} catch(e) {
  exit(4, e);
}

debug('ePub validation');

try {
  var files = new File(unzipPath);
  files.validation();
} catch(e) {
  exit(5, e);
}

debug('files validation in ePub');

exit(0);
