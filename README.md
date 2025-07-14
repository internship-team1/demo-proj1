# POP QUIZ - AI驱动的演讲效果反馈平台

POP QUIZ 是一个基于 Next.js 和 Prisma 构建的 AI 驱动演讲效果反馈平台。系统可以自动分析演讲材料（PPT、PDF 或现场录音），由 AI 自动生成相关问题和答案，听众作答后提供统计结果，帮助评估听众对演讲内容的理解程度以及参与度。

## 功能特点

- **AI 自动出题**：上传演讲材料（PPT、PDF、录音），AI 自动分析并生成相关问题
- **多角色用户系统**：支持管理员、组织者、演讲者和听众四种不同角色
- **课程管理**：创建、加入和管理课程
- **实时反馈**：听众答题后立即生成统计结果，展示理解程度
- **留言系统**：支持课程内的留言互动，区分自己和他人的留言

## 技术栈

- **前端**：Next.js 15, React 19, TailwindCSS 4
- **后端**：Next.js API Routes
- **数据库**：PostgreSQL
- **ORM**：Prisma 6
- **AI 分析**：集成 AI 服务用于材料分析和问题生成

## 本地开发环境设置

### 前提条件

- Node.js 20+ 
- npm 10+

### 安装步骤

1. **克隆仓库**

- 选择克隆仓库，输入仓库URL

2. **安装依赖**

```bash
npm install
```

3. **数据库配置**

- 在项目根目录创建一个名为 `.env` 的文件（右键点击 → 新建 → 文件，命名为 `.env`）
- 在文件中添加群里提供的env文本内容

4. **应用数据库迁移**

```bash
npx prisma migrate dev
```

5. **生成Prisma客户端**

```bash
npx prisma generate
```

6. **启动开发服务器**

```bash
npm run dev
```

应用将在 [http://localhost:3000]运行


## 开发注意事项

- 每次开发前请拉取最新代码并迁移数据
```bash
git pull
```
```bash
npx prisma migrate dev
```
- 每次开发完成后也要迁移数据，之后才能提交和推送
```bash
npx prisma migrate dev
```
- 完成一个功能可以正常运行后才能推送到仓库，否则其他队员在开发时无法确定是自己的代码有问题还是别人的有问题
- 命令ai辅助编程时使用步骤化精细化的命令，不要只是笼统的概括
- 项目已部署到平台，推送到 Git 仓库后会自动更新，使用群里的网址查看已开发的功能是否正常以及总体进度

## 项目结构

```
/app
  /admin          - 管理员界面
  /api            - API 路由
    /auth         - 认证相关 API
  /audience       - 听众界面
  /lib            - 工具库
  /organizer      - 组织者界面
  /speaker        - 演讲者界面
/prisma           - Prisma 配置和模型
  schema.prisma   - 数据库模型定义
/public           - 静态资源
```
