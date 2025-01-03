const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
app.use(express.json());

// 提供静态文件
app.use(express.static(path.join(__dirname, '../public')));

const db = new sqlite3.Database(path.join(__dirname, 'visitor.db'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if(err) {
        console.error(err.message);
    }
    console.log('Connected to the visitor database.');

});

db.run("PRAGMA key = 'medm!x@huangpinglu159';", (err) => {
    if (err) {
        console.error('Failed to set encryption key:', err.message);
    } else {
        console.log('Encryption key set successfully');
    }
});

// 创建访客表
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS visitors (id INTEGER PRIMARY KEY, name TEXT, phone TEXT, reason TEXT, visit_time TEXT, contact TEXT, company TEXT, is_visited BOOLEN DEFAULT 0, is_left BOOLEN DEFAULT 0, left_time TEXT)");
});

db.serialize(() => {
    db.run("INSERT INTO visitors (name, phone, reason, visit_time, contact, company) VALUES ('John Doe', '12345678901', '商务洽谈', '2023-10-01 10:00:00', 'Jane Smith', 'Acme Corp')");
});

//登记访客
app.post('/register', (req, res) => {
    const { name, phone, reason, visit_time, contact, company } = req.body;
    db.run("INSERT INTO visitors (name, phone, reason, visit_time, contact, company) VALUES (?, ?, ?, ?, ?, ?)", [name, phone, reason, visit_time, contact, company], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: '登记成功' });
    });
});



//获取访客列表
app.get('/visitors', (req, res) => {
    //const now = new Date().toISOString();
    db.all("SELECT id, name, company, phone, reason, visit_time, contact, is_visited, left_time,is_left FROM visitors WHERE strftime('%Y-%m-%d',visit_time)>=strftime('%Y-%m-%d','now','localtime') ORDER BY visit_time LIMIT 15", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);

    });
});

//验证手机后6位

function verifyPhone(id, phoneSuffix, callback) {
    db.get("SELECT * FROM visitors WHERE id = ? AND substr(phone, -6) = ?", [id, phoneSuffix], (err, row) => {
        if (err) {
            return callback(err);
        }
        if (row) {
            db.run("UPDATE visitors SET is_visited = 1 WHERE id = ?", [id], function (err) {
                if (err) {
                    console.error('update err', err);
                    return callback(err);
                }
                callback(null, { success: true, phone: row.phone });
            });
        } else {
            console.log('not found');
            callback(null, { success: false, message: '访客信息未找到' });
        }
    });
}


app.post('/verify', (req, res) => {
    const { id, phone } = req.body;
    verifyPhone(id, phone, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(result);
    });
});

//验证删除记录
app.post('/delete', (req, res) => {
    const { id } = req.body;
    db.run("DELETE FROM visitors WHERE id = ?", [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: '删除成功' });
    });
});

//离厂时间
app.post('/leave', (req, res) => {
    const { id } = req.body;
    const now = new Date();
    const leftTime = now.toTimeString().slice(0, 5);
    db.run("UPDATE visitors SET is_left = 1, left_time = ? WHERE id = ?", [leftTime, id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});


app.use((req, res, next) => {
    next();
});
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
