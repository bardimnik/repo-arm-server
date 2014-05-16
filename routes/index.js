var express = require('express');
var router = express.Router();

var sqlite3 = require('sqlite3').verbose();
var async = require('async');
var fs = require('fs');
var config = require('../config');

var pkgs = [];

router.get('/', function(req, res) {
    res.render('index');
});

router.get('/search', function(req, res) {

    var db = new sqlite3.Database(config.pkginfopath + '/pkginfo.db', sqlite3.OPEN_READONLY, function (err) {
        if (err) return res.end(err);
    });

    // console.log(query);
    // console.log(req.query.arch);
    // console.log(req.query.pkgname);
    // reset pkgs array.
    pkgs = [];

    db.each("SELECT * FROM pkginfo WHERE forarch=$pkgarch AND pkgname=$pkgname", {
        $pkgarch: req.query.arch,
        $pkgname: req.query.pkgname
    }, function (err, row) {
        if(err) {
            return (err);
        }
        // Query success, return packages to client.
        pkgs.push(row.pkgrepo + "|" + row.pkgname + "|" + row.pkgarch + "|" + row.pkgver + "|"
            + config.downloadurl + row.pkgrepo + "/os/" + req.query.arch
            + row.filename.substr(row.filename.lastIndexOf("/")) + "|"
            + row.pkgver.substr(row.pkgver.lastIndexOf("-" - 1))
            + "\n");
        pkgs = pkgs.naturalSort().reverse();
        /*
         res.write(
         row.pkgrepo + "|" + row.pkgname + "|" + row.pkgarch + "|" + row.pkgver + "|"
         + config.downloadurl + row.pkgrepo + "/os/" + req.query.arch
         + row.filename.substr(row.filename.lastIndexOf("/")) + "|"
         + row.pkgver.substr(row.pkgver.lastIndexOf("-" - 1))
         + "\n"
         );
         */
        // TODO what if package not found? currently return nothing.
    }, function() {
        res.end(pkgs.toString().replace(/,/g, ''));
    });

});

// TODO Duplicated code, improvement needed.

router.post('/exact', function(req, res) {
    var db = new sqlite3.Database(config.pkginfopath + '/pkginfo.db', sqlite3.OPEN_READONLY, function (err) {
        if (err) return res.end(err);
    });

    // Get POST data
    var pkgarch = req.body.arch,
        pkgname = req.body.pkgname;
    // console.log(pkgarch);
    // console.log(pkgname);

    pkgs = [];
    // console.log(query);
    db.each("SELECT * FROM pkginfo WHERE forarch=$pkgarch AND pkgname=$pkgname", {
        $pkgarch: pkgarch,
        $pkgname: pkgname
    }, function (err, row) {
        if(err) {
            return (err);
        }
        // Query success, return packages to client.
        pkgs.push(row.pkgrepo + "|" + row.pkgname + "|" + row.pkgarch + "|" + row.pkgver + "|"
            + config.downloadurl + row.pkgrepo + "/os/" + pkgarch
            + row.filename.substr(row.filename.lastIndexOf("/")) + "|"
            + row.pkgver.substr(row.pkgver.lastIndexOf("-" - 1))
            + "\n");
        pkgs = pkgs.naturalSort().reverse();
        /*
         res.write(
         row.pkgrepo + "|" + row.pkgname + "|" + row.pkgarch + "|" + row.pkgver + "|"
         + config.downloadurl + row.pkgrepo + "/os/" + pkgarch
         + row.filename.substr(row.filename.lastIndexOf("/")) + "|"
         + row.pkgver.substr(row.pkgver.lastIndexOf("-" - 1))
         + "\n"
         );
         */
    }, function() {
        res.end(pkgs.toString().replace(/,/g, ''));
    });
});

router.post('/find', function(req, res) {
    var db = new sqlite3.Database(config.pkginfopath + '/pkginfo.db', sqlite3.OPEN_READONLY, function (err) {
        if (err) return res.end(err);
    });

    // Get POST data
    var pkgarch = req.body.arch,
        pkgname = req.body.pkgname;
    // console.log(pkgarch);
    // console.log(pkgname);
    pkgs = [];

    db.each("SELECT * FROM pkginfo WHERE forarch=$pkgarch AND pkgname LIKE %$pkgname%", {
        $pkgarch: pkgarch,
        $pkgname: pkgname
    }, function (err, row) {
        if(err) {
            return (err);
        }
        // Query success, return packages to client.
        pkgs.push(row.pkgrepo + "|" + row.pkgname + "|" + row.pkgarch + "|" + row.pkgver + "|"
            + config.downloadurl + row.pkgrepo + "/os/" + pkgarch
            + row.filename.substr(row.filename.lastIndexOf("/")) + "|"
            + row.pkgver.substr(row.pkgver.lastIndexOf("-" - 1))
            + "\n");
        pkgs = pkgs.naturalSort().reverse();
        /*
         res.write(
         row.pkgrepo + "|" + row.pkgname + "|" + row.pkgarch + "|" + row.pkgver + "|"
         + config.downloadurl + row.pkgrepo + "/os/" + pkgarch
         + row.filename.substr(row.filename.lastIndexOf("/")) + "|"
         + row.pkgver.substr(row.pkgver.lastIndexOf("-" - 1))
         + "\n"
         );
         */
    }, function() {
        res.end(pkgs.toString().replace(/,/g, ''));
    });
});

router.get('/archive', function(req, res) {
    fs.readdir(config.archivepath, function(err, years) {
        if (err && err.message === 'ENOENT') {
            return res.send(404);
        } else if (err) {
            return res.send(500);
        }

        var archiveobj = {};
        async.eachSeries(years, function(year, callback) {
            archiveobj[year] = {};
            fs.readdir(config.archivepath + '/' + year, function(err, months) {
                if (err && err.message === 'ENOENT') {
                    return res.send(404);
                } else if (err) {
                    return res.send(500);
                }

                async.eachSeries(months, function(month, cb) {
                    archiveobj[year][month] = [];
                    fs.readdir(config.archivepath + '/' + year + '/' + month, function(err, day) {
                        if (err && err.message === 'ENOENT') {
                            return res.send(404);
                        } else if (err) {
                            return res.send(500);
                        }

                        archiveobj[year][month] = day;
                        cb();
                    });
                }, function(err) {
                    if (err) {
                        console.log(err);
                    }
                    callback();
                });
            });
        }, function(err) {
            if (err) {
                return res.send(500);
            }
            res.render('archive', {
                files: archiveobj
            });
        });
    });
});


router.get('/archive/:year/:month/:day/:repo/os/:pkgarch/:pkgfile', function(req, res) {
    var test4 = new RegExp(/[0-9]{4}/);
    var test2 = new RegExp(/[0-9]{2}/);
    var testarch = new RegExp(/(i686|x86_64)/);
    if (testarch.test(req.params.pkgarch) &&
        test4.test(req.params.year) &&
        test2.test(req.params.month) &&
        test2.test(req.params.day)) {
        // test passed
        if (req.params.pkgfile.indexOf('.db') !== -1) {
            return res.sendfile(config.archivepath + '/' + req.params.year + '/'
                + req.params.month + '/' + req.params.day + '/' + req.params.repo +
                '/os/' + req.params.pkgarch + '/' + req.params.pkgfile);
        } else {
            res.sendfile(config.pkgpath + req.params.repo +
                '/os/' + req.params.pkgarch + '/' + req.params.pkgfile);
        }
    } else {
        res.send(400);
    }
});

module.exports = router;

// Natural sort function from
// http://stackoverflow.com/questions/4373018/sort-array-of-numeric-alphabetical-elements-natural-sort
Array.prototype.naturalSort = function() {
    var a, b, a1, b1, rx=/(\d+)|(\D+)/g, rd=/\d+/;
    return this.sort(function(as, bs){
        a= String(as).toLowerCase().match(rx);
        b= String(bs).toLowerCase().match(rx);
        while(a.length && b.length){
            a1= a.shift();
            b1= b.shift();
            if(rd.test(a1) || rd.test(b1)){
                if(!rd.test(a1)) return 1;
                if(!rd.test(b1)) return -1;
                if(a1!= b1) return a1-b1;
            }
            else if(a1!= b1) return a1> b1? 1: -1;
        }
        return a.length- b.length;
    });
};

