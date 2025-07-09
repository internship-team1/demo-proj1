import sqlite3

# 连接到 SQLite 数据库（如果文件不存在会自动创建）
conn = sqlite3.connect('example.db')
cursor = conn.cursor()

# 创建表（如果不存在）
cursor.execute('''
    CREATE TABLE IF NOT EXISTS strings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL
    )
''')

# 要存储的字符串
my_string = "你好，世界！"

# 插入字符串到数据库
cursor.execute('INSERT INTO strings (content) VALUES (?)', (my_string,))

# 提交事务
conn.commit()

# 关闭连接
conn.close()

print("字符串已成功存入数据库！")
import sqlite3

# 连接到 SQLite 数据库
conn = sqlite3.connect('example.db')
cursor = conn.cursor()

# 查询所有存储的字符串
cursor.execute('SELECT id, content FROM strings')
rows = cursor.fetchall()

# 显示结果
for row in rows:
    print(f"ID: {row[0]}, 内容: {row[1]}")

# 关闭连接
conn.close()