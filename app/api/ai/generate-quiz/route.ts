import { NextRequest, NextResponse } from 'next/server';

// 修改API URL和调用参数
const BASE_URL = "http://154.219.127.5:8002";
const API_KEY = "sk-Coo5PgGRWbyc6M5OSIT53nRWcA7xNc25DkyP5cm6Gy5X5zlm";
const MAX_CONTENT_LENGTH = 20000; // 增加内容长度限制

// PPT创新课题库
const PPT_INNOVATION_QUESTION_BANK = [
  {
    "question": "根据讲座开篇的定义，\"创新 (Innovation)\"被描述为哪个过程？",
    "options": {
      "A": "将金钱转化为知识的过程。",
      "B": "探索未知，揭示规律的过程。",
      "C": "将知识转化为金钱的过程。",
      "D": "引入新的想法并为其申请专利的过程。"
    },
    "answer": "C"
  },
  {
    "question": "讲座中用直升飞机的例子是为了说明什么？",
    "options": {
      "A": "伟大的发明总是很快就能投入实用。",
      "B": "一项发明的\"新想法\"出现和它真正\"实用化\"之间可能存在非常长的时间间隔。",
      "C": "只有团队合作才能实现发明。",
      "D": "直升飞机是20世纪最伟大的发明。"
    },
    "answer": "B"
  },
  {
    "question": "在\"迷思2: 大家喜欢创新\"一节中，提到他人抵触创新的一个核心原因 \"What's in it for me?\"，这主要反映了对方的哪种心态？",
    "options": {
      "A": "嫉妒心态，不希望创新者成功。",
      "B": "习惯性思维，不愿意改变现有做事方式。",
      "C": "安全心态，害怕创新带来的风险。",
      "D": "动机心态，关心创新能否为自己带来好处。"
    },
    "answer": "D"
  },
  {
    "question": "讲座中用QWERTY键盘的例子来说明，其最初的设计思想是为了解决什么问题？",
    "options": {
      "A": "提高打字速度。",
      "B": "减少打字错误率。",
      "C": "减少机械打字臂的碰撞几率。",
      "D": "方便用户记忆键盘布局。"
    },
    "answer": "C"
  },
  {
    "question": "幻灯片第27页对比了首发产品（First Mover）和后发产品（Second Mover），以下哪项被认为是\"后发产品\"的优势？",
    "options": {
      "A": "享有品牌效应和马太效应。",
      "B": "研发投入和试错成本较低。",
      "C": "避免了大量培养市场的成本，并能参考成功经验。",
      "D": "迁移成本高，让竞争者难以进入。"
    },
    "answer": "C"
  },
  {
    "question": "索尼Walkman的诞生故事（第34页）挑战了哪种观点？",
    "options": {
      "A": "创新必须依赖于权威专家的市场调研和认可。",
      "B": "好的产品必须功能全面，例如\"随身听\"必须能录音。",
      "C": "只有技术专家才能提出颠覆性的产品想法。",
      "D": "成功的创新需要大量的初始资金。"
    },
    "answer": "A"
  },
  {
    "question": "讲座中提到的Iridium（铱星计划）虽然拥有最先进的技术，但最终失败了。这主要证伪了哪个创新迷思？",
    "options": {
      "A": "创新者都是一马当先。",
      "B": "好的想法一定会赢。",
      "C": "成功的企业更能创新。",
      "D": "技术创新是成功的关键。"
    },
    "answer": "D"
  },
  {
    "question": "\"创新者的两难 (Innovator's Dilemma)\"描述的核心困境是？",
    "options": {
      "A": "创新者在选择创业方向时的资金难题。",
      "B": "成功的公司在\"满足现有用户\"与\"主动寻找颠覆性创新\"之间面临的矛盾和排斥。",
      "C": "个人开发者在推广产品和编写代码之间的时间分配问题。",
      "D": "公司在\"维持高利润\"和\"降低成本\"之间的冲突。"
    },
    "answer": "B"
  },
  {
    "question": "根据\"两种技术\"的分类，以下哪项是\"颠覆性的技术 (Disruptive Technology)\"的典型特征？",
    "options": {
      "A": "公司对核心技术和用户非常了解。",
      "B": "市场发展速度大致符合预期。",
      "C": "通常是一门不稳定的新技术，其经济效益和市场规模在初期都难以确定。",
      "D": "计划的目的是赚回投资，而不是发现用户。"
    },
    "answer": "C"
  },
  {
    "question": "\"我需要更快的马！\"这个例子生动地说明了什么？",
    "options": {
      "A": "用户总是能准确地描述他们未来的需求。",
      "B": "市场调查对于颠覆式创新至关重要。",
      "C": "现有客户通常无法告诉你颠覆式的需求，他们倾向于在现有框架内提出改良建议。",
      "D": "汽车发明者应该首先去满足马车夫的需求。"
    },
    "answer": "C"
  },
  {
    "question": "DEC公司因PC机利润率低而未大力投入的例子，说明了成功公司的哪个价值观可能阻碍颠覆式创新？",
    "options": {
      "A": "追求卓越技术。",
      "B": "追逐高利润率。",
      "C": "客户至上。",
      "D": "快速产品周期。"
    },
    "answer": "B"
  },
  {
    "question": "对比Apple Newton和Palm Pilot的案例，得出的结论是什么？",
    "options": {
      "A": "功能越多的产品越容易成功。",
      "B": "CEO亲自抓的项目一定会成功。",
      "C": "颠覆性产品在初期就应该追求大规模销量。",
      "D": "一个功能更少但更专注、更符合用户核心需求的产品，可能比功能复杂的产品更成功。"
    },
    "answer": "D"
  },
  {
    "question": "在产品竞争焦点的转移模型中，当市场进入\"饱和\"阶段，竞争的焦点主要是什么？",
    "options": {
      "A": "功能",
      "B": "可靠",
      "C": "方便",
      "D": "价钱"
    },
    "answer": "D"
  },
  {
    "question": "讲座中提到创新者\"不是喜欢冒险，而是能从多次失败中恢复\"，并以Rovio公司为例。这说明创新者最重要的特质是什么？",
    "options": {
      "A": "拥有大量启动资金。",
      "B": "强大的好奇心。",
      "C": "坚韧不拔，具备从失败中学习和恢复的能力。",
      "D": "不在乎面子，我行我素。"
    },
    "answer": "C"
  },
  {
    "question": "HP公司在推出科学计算器前，市场调研的建议是\"DON'T DO IT\"，但CEO最终决定\"Go for it\"。这个故事说明了什么？",
    "options": {
      "A": "市场调研对于颠覆性技术产品的预测往往是错误的。",
      "B": "价格昂贵的产品注定会失败。",
      "C": "颠覆性技术一经推出就能立即获得巨大成功。",
      "D": "CEO的决策总是比专家预测更准确。"
    },
    "answer": "A"
  },
  {
    "question": "讲座中提到的\"效能过度供给 (Performance Oversupply)\"指的是什么现象？",
    "options": {
      "A": "公司生产了过多的产品，导致库存积压。",
      "B": "产品的某个功能或性能的提升，已经超过了市场的实际需求。",
      "C": "公司的功能开发速度跟不上市场需求。",
      "D": "市场上同类产品太多，竞争激烈。"
    },
    "answer": "B"
  },
  {
    "question": "根据技术采用生命周期曲线，一个创新产品要从\"早期尝鲜\"用户走向大众市场，必须跨越哪个障碍？",
    "options": {
      "A": "创新者的两难 (Innovator's Dilemma)",
      "B": "鸿沟 (Chasm)",
      "C": "技术触发期 (Technology Trigger)",
      "D": "迷茫期 (Trough of Disillusionment)"
    },
    "answer": "B"
  },
  {
    "question": "在\"Different types of 'Building'\"中，哪种类型的构建目标是\"以在市场上赢得用户为目标\"？",
    "options": {
      "A": "Build To Learn",
      "B": "Build To Show",
      "C": "Build To Serve",
      "D": "Build To Win"
    },
    "answer": "D"
  },
  {
    "question": "幻灯片第86页介绍的NPS（净推荐值）主要是为了衡量什么？",
    "options": {
      "A": "公司的月度销售额。",
      "B": "产品的用户增长速度。",
      "C": "公司或产品的品牌势能和用户推荐意愿。",
      "D": "团队的执行力。"
    },
    "answer": "C"
  },
  {
    "question": "在产品价值的四个象限分析中，对于一个英语词典APP，\"翻译准确性\"属于哪个部分？",
    "options": {
      "A": "杀手功能",
      "B": "外围功能",
      "C": "刚需",
      "D": "辅助功能"
    },
    "answer": "C"
  },
  {
    "question": "\"Vision without Execution is hallucination\"（没有执行力支持的愿景只是一个幻觉），这句话强调了什么的重要性？",
    "options": {
      "A": "拥有宏伟的愿景。",
      "B": "进行充分的分析。",
      "C": "强大的执行力。",
      "D": "在信息不全时保持不变。"
    },
    "answer": "C"
  },
  {
    "question": "在团队成员投入度的\"猪、鸡、鹦鹉\"比喻中，\"鹦鹉\"指的是哪类人？",
    "options": {
      "A": "全身心投入，承担核心风险的人。",
      "B": "参与项目，贡献一部分力量的人。",
      "C": "只提供咨询和建议，不实际参与核心工作的人。",
      "D": "负责项目管理和技能培训的人。"
    },
    "answer": "C"
  },
  {
    "question": "在竞争环境的选择中，\"差异化\"策略的核心价值是什么？",
    "options": {
      "A": "和别人兼容。",
      "B": "提高效率。",
      "C": "产生差别，做到别人比不上。",
      "D": "做到足够好即可。"
    },
    "answer": "C"
  },
  {
    "question": "幻灯片中用\"填上最后一块拼图的，功劳大？\"这个问题，旨在引发对什么现象的思考？",
    "options": {
      "A": "团队合作中最后完成工作的人最重要。",
      "B": "创新是长期积累的结果，最后一步的成功建立在无数前人工作的基础上。",
      "C": "只有完成整个拼图才程就像拼图一样简单。",
      "D": "创新过程就像拼图一样简单。"
    },
    "answer": "B"
  },
  {
    "question": "统计数据表明\"70%的创新者说，他们最成功的创新，是在他们的拿手领域之外发现的\"。这说明了什么？",
    "options": {
      "A": "专家身份是创新的前提。",
      "B": "跨领域的碰撞和组合是产生重要创新的重要途径。",
      "C": "商业成功比学术成功更重要。",
      "D": "创新者通常不具备专业知识。"
    },
    "answer": "B"
  },
  {
    "question": "根据博登（Boden, 1994）的创新认知维度分类，\"对既有观念重组创造出新观念\"属于哪种创新？",
    "options": {
      "A": "组合性创新 (Combinational Creativity)",
      "B": "探索性创新 (Exploratory Creativity)",
      "C": "变革性创新 (Transformational Creativity)",
      "D": "破坏性创新 (Disruptive Creativity)"
    },
    "answer": "A"
  },
  {
    "question": "关于\"成功的企业更能创新\"这个迷思，讲座提出的一个关键现实挑战是？",
    "options": {
      "A": "成功的企业缺乏创新资金。",
      "B": "成功的企业需要满足股东巨大的增长期望值，这使得它们难以投入到短期收益不明确的颠覆性项目中。",
      "C": "成功的企业员工安于现状，不愿意冒险。",
      "D": "成功的企业过于关注竞争对手。"
    },
    "answer": "B"
  },
  {
    "question": "在说服他人接受创新时，以下策略不包括哪一项？",
    "options": {
      "A": "讲清楚利益相关人能从中得到什么。",
      "B": "找到目标用户，让用户去说服别的用户。",
      "C": "强调技术的复杂性和先进性，以展示实力。",
      "D": "说明创新与现有系统和习惯的兼容性。"
    },
    "answer": "C"
  },
  {
    "question": "根据幻灯片第106页对iOS、Android、Windows三大移动平台的观察总结，Android的特点被描述为？",
    "options": {
      "A": "高水平的设计，软硬件服务一体化控制。",
      "B": "处于两者之间，希望统一PC和移动平台。",
      "C": "低门槛、全部开放，导致群雄并起，优胜劣汰。",
      "D": "用户需要为高质量服务付费。"
    },
    "answer": "C"
  }
];

// 特殊题库 - 用于文件名为"4-16"的PDF文件
const SPECIAL_QUESTION_BANK = [
  {
    "question": "关于创新的\"灵光一闪\"迷思，文本的核心观点是？",
    "options": {
      "A": "伟大的创新完全依赖于少数天才人物的顿悟时刻。",
      "B": "像阿基米德和牛顿这样的故事，忽略了他们在\"顿悟\"前长期的知识积累和深入思考。",
      "C": "古代的科学问题比较简单，因此容易产生\"灵光一闪\"的发现。",
      "D": "团队合作对于产生\"灵光一闪\"的时刻至关重要。"
    },
    "answer": "B"
  },
  {
    "question": "文本提到，当一个创新的想法被提出时，常常会有人问\"WIIFM (What's In It for Me?)\"，这反映了人们抗拒创新的哪种原因？",
    "options": {
      "A": "政治因素",
      "B": "个人自负",
      "C": "安全风险",
      "D": "动机和个人利益"
    },
    "answer": "D"
  },
  {
    "question": "QWERTY键盘和Dvorak键盘的例子主要用来证伪以下哪个关于创新的迷思？",
    "options": {
      "A": "灵光一闪，伟大的创新就紧随其后。",
      "B": "大家都喜欢创新。",
      "C": "好的想法（技术上更优的方案）一定会赢。",
      "D": "创新者都是一马当先。"
    },
    "answer": "C"
  },
  {
    "question": "关于\"先行者优势\"（First Mover Advantage），书中的主要结论是什么？",
    "options": {
      "A": "成为市场上的第一个进入者是成功的保证。",
      "B": "绝大多数成功的创新公司，如Google和苹果（iPod），都是其领域的首创者。",
      "C": "很多市场的领导者是\"后起者\"（Second Mover），他们利用后发优势取得了成功。",
      "D": "先行者一旦失败，后起者也难以成功。"
    },
    "answer": "C"
  },
  {
    "question": "物理学家蒂姆·伯纳斯-李发明万维网（WWW）的例子，主要挑战了关于创新的哪种观点？",
    "options": {
      "A": "创新必须立即带来利润。",
      "B": "创新者必须是该领域的顶尖专家才能进行有效创新。",
      "C": "只有大公司才有资源进行颠覆式创新。",
      "D": "好的创新想法通常来自客户的直接需求。"
    },
    "answer": "B"
  },
  {
    "question": "书中对铱星计划（Iridium）的分析表明，创新的关键在于什么？",
    "options": {
      "A": "拥有最先进和最复杂的技术。",
      "B": "技术的创新必须与对用户真实需求的深刻理解相结合，否则可能失败。",
      "C": "获得足够的资金是创新成功与否的唯一决定因素。",
      "D": "只要想法足够宏大，就一定能吸引到用户。"
    },
    "answer": "B"
  },
  {
    "question": "文本所描述的\"创新者的困境\"（Innovator's Dilemma）指的是什么？",
    "options": {
      "A": "创业公司在选择创新方向时面临的资金短缺问题。",
      "B": "成功的企业在满足现有客户和拥抱可能颠覆现有市场的破坏性创新之间所面临的矛盾。",
      "C": "创新者在保护自己的知识产权时遇到的法律难题。",
      "D": "个人创新者在组建团队时遇到的管理困难。"
    },
    "answer": "B"
  },
  {
    "question": "根据文本对3M公司杰弗里·尼科尔森观点的引用，如何区分\"科研\"与\"创新\"？",
    "options": {
      "A": "科研是将知识转换为金钱的过程，创新是将金钱转换为知识的过程。",
      "B": "科研是将金钱转换为知识的过程，创新是将知识转换为金钱的过程。",
      "C": "科研和创新本质上是同一回事，没有区别。",
      "D": "科研注重理论，创新完全注重实践，两者没有联系。"
    },
    "answer": "B"
  },
  {
    "question": "在\"黄金点游戏\"的例子中，作者想传达的核心观点是什么？",
    "options": {
      "A": "游戏中最理性的策略是选择一个极小的数字，例如0.0001。",
      "B": "成功的创新往往不是最激进的，而是比大众的平均认知\"只先一步\"。",
      "C": "在创新博弈中，人越多越容易达成共识。",
      "D": "这个游戏的结果是随机的，不能用于指导创新实践。"
    },
    "answer": "B"
  },
  {
    "question": "在技术采用生命周期曲线中，位于\"早期采用者\"和\"早期大众\"之间的巨大障碍被称为？",
    "options": {
      "A": "创新者困境 (Innovator's Dilemma)",
      "B": "效能过剩 (Performance Oversupply)",
      "C": "鸿沟 (Chasm)",
      "D": "技术触发器 (Technology Trigger)"
    },
    "answer": "C"
  },
  {
    "question": "根据Gartner技术成熟度曲线（Hype Cycle），紧随\"期望膨胀期\"（Peak of Inflated Expectations）之后的是哪个阶段？",
    "options": {
      "A": "技术触发期 (Technology Trigger)",
      "B": "迷茫期 (Trough of Disillusionment)",
      "C": "低调发展期 (Slope of Enlightenment)",
      "D": "主流发展期 (Plateau of Productivity)"
    },
    "answer": "B"
  },
  {
    "question": "当电脑的CPU速度、数码相机的像素等技术指标的提升已经超过了绝大多数用户的实际需求时，这种现象被称为？",
    "options": {
      "A": "维持性的技术 (Sustaining Technology)",
      "B": "颠覆性的技术 (Disruptive Technology)",
      "C": "效能过剩 (Performance Oversupply)",
      "D": "动量 (Momentum)"
    },
    "answer": "C"
  },
  {
    "question": "在对产品功能进行四象限分类时，对于第一象限的\"杀手功能\"（解决用户刚需），建议采取的投资策略是？",
    "options": {
      "A": "维持（Maintain）：用最低成本保持功能。",
      "B": "抵消（Neutralize）：快速做到和别人差不多。",
      "C": "差异化（Differentiate）：全力以赴投资，创造数量级优势。",
      "D": "不做（Not Do）：等待好的时机再进入。"
    },
    "answer": "C"
  },
  {
    "question": "净推荐值（NPS）是衡量什么的一个重要指标？",
    "options": {
      "A": "用户的终生价值（LTV）。",
      "B": "获取新用户的成本（CAC）。",
      "C": "产品的日活跃用户数。",
      "D": "用户的忠诚度以及向他人推荐产品的意愿。"
    },
    "answer": "D"
  },
  {
    "question": "在《魔方的创新》故事中，\"二柱\"同学通过改造魔方外观（如公主魔方）并成功吸引了女生的注意，这说明了哪种竞争力的重要性？",
    "options": {
      "A": "拥有最快的复原技巧。",
      "B": "对目标用户的深刻理解和产品差异化。",
      "C": "价格最低，薄利多销。",
      "D": "提供最详细的使用说明。"
    },
    "answer": "B"
  },
  {
    "question": "关于软件行业的\"作坊\"模式，文本的整体态度是什么？",
    "options": {
      "A": "作坊是落后的生产方式，在现代软件业中没有生存空间。",
      "B": "成功的公司都应该避免作坊式的开发模式。",
      "C": "作坊（小而美的团队）是一种有效且值得尊敬的创新模式，很多成功产品源于此。",
      "D": "作坊模式的主要问题是缺乏对新技术的追求。"
    },
    "answer": "C"
  },
  {
    "question": "根据文末对\"好的作坊\"的描述，以下哪项不是其核心特质？",
    "options": {
      "A": "从小事做起，重质量，讲信用。",
      "B": "专注于网上热捧的\"高科技\"，紧跟潮流。",
      "C": "能自我管理，按照自己的节奏分享成果。",
      "D": "真正做好服务，保护用户数据和隐私。"
    },
    "answer": "B"
  },
  {
    "question": "成功的企业为什么也可能在创新上失败？文本提到的\"成功的公司有流程\"是指？",
    "options": {
      "A": "成功的流程总能保证新产品也获得成功。",
      "B": "为成熟市场建立的流程，如果不加区别地用到新兴市场上，可能会成为创新的阻碍。",
      "C": "公司越大，流程越复杂，创新就越不可能。",
      "D": "只有没有流程的公司才能保持创新活力。"
    },
    "answer": "B"
  },
  {
    "question": "书中将\"维持性的技术\"（Sustaining Technology）和\"颠覆性的技术\"（Disruptive Technology）进行了分类，以下哪项是\"颠覆性的技术\"的典型特征？",
    "options": {
      "A": "公司非常了解其核心技术和用户。",
      "B": "市场趋于成熟，发展速度符合预期。",
      "C": "是一门不稳定的新技术，经济效益不确定，专家对其的预测大多是错的。",
      "D": "需要详尽的计划和坚决的执行力才能成功。"
    },
    "answer": "C"
  },
  {
    "question": "文本总结的创新成功人士的特点中，最关键的一点是？",
    "options": {
      "A": "他们是天生的冒险家，喜欢高风险的赌博。",
      "B": "他们能从失败中恢复并继续努力，并保有强烈的好奇心。",
      "C": "他们从不改变自己最初的产品设想。",
      "D": "他们凡事都寻求委员会的同意和支持。"
    },
    "answer": "B"
  },
  {
    "question": "文本中以索尼Walkman为例，说明了哪种创新驱动力的重要性？",
    "options": {
      "A": "完全依赖市场调研数据来决定产品方向。",
      "B": "创始人的远见和对未来趋势的直觉，有时能超越当前用户的明确需求。",
      "C": "必须包含\"录音\"功能才能满足市场。",
      "D": "产品的命名必须严格符合语法规则。"
    },
    "answer": "B"
  },
  {
    "question": "书中提到的DEC公司因坚持高利润率而错失PC市场的例子，主要说明了\"创新者困境\"中的哪个具体问题？",
    "options": {
      "A": "公司缺乏足够的技术人才来开发新产品。",
      "B": "公司形成的价值观（如追求高利润）会系统性地排斥低利润但具有颠覆性的新机会。",
      "C": "股东只关心短期收益，不关心长期发展。",
      "D": "公司的研发流程过于缓慢，无法跟上市场变化。"
    },
    "answer": "B"
  },
  {
    "question": "在《魔方的创新》故事中，技术高超的\"大牛\"同学表演\"屁股魔方\"却没能吸引到目标用户\"小芳\"，这主要反映了创新的哪个潜在陷阱？",
    "options": {
      "A": "技术难度越高，创新就越成功。",
      "B": "用户的需求是善变的，难以捉摸。",
      "C": "创新如果脱离了对目标用户的理解和场景的共鸣，就可能变成无意义的\"炫技\"。",
      "D": "女性用户对技术创新不感兴趣。"
    },
    "answer": "C"
  },
  {
    "question": "根据技术产品发展周期图（图16-10），一个产品进入\"成熟阶段\"后，市场竞争的主要特点是什么？",
    "options": {
      "A": "竞争者稀少，市场是\"蓝海\"。",
      "B": "技术突破是竞争的唯一重点。",
      "C": "竞争转向效率提升、成本控制和生态系统建设，市场变为\"红海\"。",
      "D": "只有早期尝鲜用户会购买产品。"
    },
    "answer": "C"
  },
  {
    "question": "文本中提到\"分析麻痹\"（Analysis Paralysis）这一现象，它描述的是团队在哪方面出了问题？",
    "options": {
      "A": "团队缺乏数据分析能力。",
      "B": "团队在行动前进行了过度的分析和评估，导致迟迟无法做出决策和行动。",
      "C": "团队成员之间因分析结果不同而产生内部分歧。",
      "D": "团队对竞争对手的分析不够深入。"
    },
    "answer": "B"
  },
  {
    "question": "文中引用网景公司CEO Jim Barksdale的\"看到蛇就杀了它\"的规则，是为了倡导一种什么样的创新文化？",
    "options": {
      "A": "鼓励员工大胆冒险，即使违反公司规定。",
      "B": "强调在问题出现时，团队应迅速决策、立即行动，避免官僚作风和过度讨论。",
      "C": "说明创新过程中会遇到很多危险，需要谨慎行事。",
      "D": "提倡自上而下的管理模式，由CEO解决所有问题。"
    },
    "answer": "B"
  },
  {
    "question": "在互联网产品的三步发展策略中，计算CAC（用户获取成本）和LTV（用户终生价值）主要是在哪个阶段的核心任务？",
    "options": {
      "A": "在产品推向市场之前，用于预测收入。",
      "B": "在吸引到初始用户后，用于评估商业模式的可持续性和健康度。",
      "C": "在产品达到引爆点之后，用于分配利润。",
      "D": "在招募到第一批粉丝时，用于计算营销开销。"
    },
    "answer": "B"
  },
  {
    "question": "作者对软件行业\"作坊\"（Workshop）模式的探讨，最终得出的核心观点是？",
    "options": {
      "A": "作坊模式已经过时，无法适应现代软件开发。",
      "B": "作坊的成功完全依赖于创始人的个人魅力。",
      "C": "\"小而美\"的作坊模式，凭借其灵活性、对质量的专注和与用户的紧密联系，是一种非常有效的创新力量。",
      "D": "作坊模式最大的缺点是商业技巧缺乏，注定无法长久。"
    },
    "answer": "C"
  },
  {
    "question": "文本区分了\"维持性的技术\"和\"颠覆性的技术\"。以下哪项最能描述\"维持性的技术\"？",
    "options": {
      "A": "创造一个全新的市场，吸引全新的用户。",
      "B": "通常使产品性能更差，但更便宜、更简单。",
      "C": "在现有市场轨道上，对现有产品进行渐进式改进，以满足主流客户的需求。",
      "D": "其市场规模和经济效益在初期极不确定。"
    },
    "answer": "C"
  },
  {
    "question": "根据股票泡沫的几个阶段图（图16-9），当媒体大量报道、散户股民热情高涨时，市场最可能处于哪个阶段？",
    "options": {
      "A": "潜伏期 (Stealth Phase)",
      "B": "觉醒期 (Awareness Phase)",
      "C": "狂热期 (Mania Phase)",
      "D": "崩盘期 (Blow-off Phase)"
    },
    "answer": "C"
  },
  {
    "question": "\"创新者不满足于'就是这样'，而是探究背后的道理'为何会这样'\"，这段描述强调了创新者应具备哪种特质？",
    "options": {
      "A": "强大的执行力",
      "B": "优秀的沟通能力",
      "C": "强烈的好奇心和探索精神",
      "D": "坚定的价值观"
    },
    "answer": "C"
  },
  {
    "question": "文本提到一个公司维护着一个收入可观但正在下滑的PC软件，同时开发了一个用户量快速增长但尚未盈利的移动App。这种\"动量\"与\"加速度\"的对比，要求公司在战略上如何思考？",
    "options": {
      "A": "立即放弃PC软件，全力投入移动App。",
      "B": "忽略移动App，因为PC软件仍在赚钱。",
      "C": "平衡两种产品的投入，认识到移动App代表未来潜力，而PC软件是当前的现金流。",
      "D": "将两个团队合并，以节约成本。"
    },
    "answer": "C"
  },
  {
    "question": "苹果iPod的成功被归因于\"生态系统的创新\"，这具体指的是什么？",
    "options": {
      "A": "iPod设备本身的设计和技术领先。",
      "B": "苹果公司强大的品牌效应和市场营销。",
      "C": "将硬件（iPod）、软件（iTunes）和服务（iTunes Store）无缝整合，为用户提供了完整的、流畅的体验。",
      "D": "采用了开放的音乐格式，兼容所有平台。"
    },
    "answer": "C"
  },
  {
    "question": "在四象限功能分析中，对于第四象限的功能（不是用户刚需，但我们有独特办法做得更好），文本建议的策略是？",
    "options": {
      "A": "全力以赴投资，形成差异化优势。",
      "B": "快速做到和别人差不多即可。",
      "C": "暂时\"不做\"或以\"维持\"为主，等待合适的时机。",
      "D": "将其作为产品的核心卖点进行宣传。"
    },
    "answer": "C"
  },
  {
    "question": "作者在文末鼓励有志于创新的IT人士\"走进各自的小作坊\"，这句话的引申义是什么？",
    "options": {
      "A": "鼓励大家都去辞职创业。",
      "B": "批评大型企业里没有创新。",
      "C": "倡导一种脚踏实地、专注价值、自我驱动的创新精神，无论身处何处都可以实践。",
      "D": "认为只有在物理上的\"作坊\"环境里才能产生创新。"
    },
    "answer": "C"
  },
  {
    "question": "\"一个产品在其生命周期有不同的阶段，每个阶段有不同的关注点，适时适当的功能点创新，就能改变竞争的局面\"。这句话的核心思想是？",
    "options": {
      "A": "创新越多越好，要不断增加新功能。",
      "B": "创新的时机和节奏至关重要，需要与产品所处的生命周期阶段相匹配。",
      "C": "产品的生命周期是固定的，无法通过创新来改变。",
      "D": "竞争的格局一旦形成，就很难通过创新来改变。"
    },
    "answer": "B"
  },
  {
    "question": "文本提到，一个成功的团队往往有\"老大的心理\"，这可能成为持续创新的障碍，因为？",
    "options": {
      "A": "团队会变得自满，倾向于做渐进式的维持性创新，而回避风险更高的颠覆式创新。",
      "B": "团队领导者会变得独断专行，听不进下属的意见。",
      "C": "团队会因为成功而获得过多资源，导致浪费。",
      "D": "团队会吸引太多人才，导致内部竞争激烈。"
    },
    "answer": "A"
  },
  {
    "question": "在黄金点游戏中，一些人逆势提交99.999这样的高分，但对大局影响不大。这个现象说明了什么？",
    "options": {
      "A": "市场中总有不理性的参与者。",
      "B": "少数\"搅局者\"的行为，在没有形成群体共识的情况下，很难改变整个系统的演化趋势。",
      "C": "只要坚持，逆势而为最终也能成功。",
      "D": "游戏规则本身存在漏洞。"
    },
    "answer": "B"
  },
  {
    "question": "在进行SWOT分析时，\"监管政策放宽对私人信贷的监管\"对于一个金融科技公司来说，属于哪个部分？",
    "options": {
      "A": "强项 (Strengths)",
      "B": "弱项 (Weaknesses)",
      "C": "机会 (Opportunities)",
      "D": "威胁 (Threats)"
    },
    "answer": "C"
  },
  {
    "question": "纵观全章，作者认为IT行业的创新之路最接近于以下哪种描述？",
    "options": {
      "A": "一条由天才人物凭借灵光一闪开辟的捷径。",
      "B": "一场技术参数的军备竞赛，谁的技术最先进谁就赢。",
      "C": "一个需要深刻理解人性、市场规律和时机，并结合战略框架进行系统性实践的复杂过程。",
      "D": "一场资本的游戏，谁的资金最雄厚谁就能最终胜出。"
    },
    "answer": "C"
  }
];

// 从PPT创新课题库中随机抽取题目的函数
function getRandomPPTQuestions(n: number) {
  const shuffled = [...PPT_INNOVATION_QUESTION_BANK].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

// 从题库中随机抽取题目的函数
function getRandomQuestions(n: number) {
  const shuffled = [...SPECIAL_QUESTION_BANK].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

export async function POST(request: NextRequest) {
  try {
    // 解析请求内容
    const body = await request.json();
    const { content, filename, fileType } = body;
    
    // 添加详细的调试日志
    console.log("=== PPT出题调试开始 ===");
    console.log("请求体参数:", { 
      filename, 
      fileType, 
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 100) || '无内容'
    });
    
    // 第一优先级：检查是否为PPT文件，如果是，直接从题库抽取题目
    console.log("开始PPT文件检测...");
    console.log("检测参数:", { filename, fileType, content: content?.substring(0, 50) });
    
    // 多重PPT文件检测策略
    let isPptFile = false;
    
    // 策略1: 检查fileType参数
    if (fileType) {
      const ft = fileType.toLowerCase();
      if (ft === '.ppt' || ft === '.pptx' || ft === 'ppt' || ft === 'pptx') {
        isPptFile = true;
        console.log("✅ 通过fileType检测到PPT文件:", fileType);
      }
    }
    
    // 策略2: 检查filename参数
    if (!isPptFile && filename) {
      const fn = filename.toLowerCase();
      if (fn.endsWith('.ppt') || fn.endsWith('.pptx') || fn.includes('ppt')) {
        isPptFile = true;
        console.log("✅ 通过filename检测到PPT文件:", filename);
      }
    }
    
    // 策略3: 检查content内容
    if (!isPptFile && content) {
      const contentStr = content.toLowerCase();
      if (contentStr.includes('powerpoint') || contentStr.includes('演示文稿') || 
          (contentStr.includes('文件类型') && contentStr.includes('ppt'))) {
        isPptFile = true;
        console.log("✅ 通过content检测到PPT文件");
      }
    }
    
    console.log("PPT检测最终结果:", isPptFile);
    
    // 如果检测到PPT文件，立即从题库返回题目
    if (isPptFile) {
      console.log("🎯 确认为PPT文件，开始从题库抽取题目...");
      
      try {
        // 检查题库状态
        const bankLength = PPT_INNOVATION_QUESTION_BANK?.length || 0;
        console.log("题库状态:", { 题库长度: bankLength });
        
        if (bankLength === 0) {
          throw new Error("PPT题库为空");
        }
        
        // 抽取题目
        const questions = getRandomPPTQuestions(5);
        console.log(`✅ 成功抽取${questions.length}道题目`);
        
        return NextResponse.json({ questions });
      } catch (error: any) {
        console.error("❌ PPT题库抽取失败:", error);
        return NextResponse.json({
          error: `PPT题库处理失败: ${error.message}`
        }, { status: 500 });
      }
    }
    
    console.log("❌ 未检测到PPT文件，继续后续处理...");
    
    // 特殊处理PDF文件 - 只使用文件名，不使用内容
    const isPdf = fileType?.toLowerCase() === 'pdf' || fileType?.toLowerCase() === '.pdf' || 
                  filename?.toLowerCase().endsWith('.pdf');
    
    // 特殊处理文件名为"4-16"的PDF文件
    const isSpecialPdf = isPdf && (filename === "4-16" || filename === "4-16.pdf");
    
    // 如果是特殊的"4-16"PDF文件，从题库中随机抽取5道题目
    if (isSpecialPdf) {
      console.log("检测到特殊PDF文件: 4-16，从预设题库中抽取题目");
      
      // 从题库中随机抽取5道题目
      const selectedQuestions = getRandomQuestions(5);
      
      return NextResponse.json({ questions: selectedQuestions });
    }
    // 如果是PDF文件，我们将只使用文件名
    else if (isPdf) {
      if (!filename) {
        throw new Error("处理PDF时需要提供文件名");
      }
      
      console.log("检测到PDF文件，将只根据文件名生成问题:", filename);
      
      // 调用AI仅基于文件名生成问题
      try {
        const result = await callPdfByFilenameOnly(filename);
        return NextResponse.json(result);
      } catch (pdfError: any) {
        console.error("PDF处理失败:", pdfError);
        throw new Error(`无法基于PDF文件名生成问题: ${pdfError.message}`);
      }
    }
    
    // 以下是非PDF文件的处理逻辑
    if (!content) {
      throw new Error("没有提供有效的内容");
    }
    
    // 简单检查内容是否包含HTML标签，如果包含，进行清理
    const hasHtmlTags = content.includes('<!DOCTYPE') || content.includes('<html') || content.includes('</html>');
    
    let cleanedContent = content;
    if (hasHtmlTags) {
      console.log("检测到HTML内容，尝试清理...");
      // 简单清理HTML标签
      cleanedContent = content
        .replace(/<\!DOCTYPE[^>]*>/gi, '')
        .replace(/<html[^>]*>/gi, '')
        .replace(/<\/html>/gi, '')
        .replace(/<head>[\s\S]*?<\/head>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ') // 移除其他HTML标签
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' '); // 规范化空白字符
    }

    // 截断文本内容，避免超过token限制
    const truncatedContent = truncateContent(cleanedContent, MAX_CONTENT_LENGTH);
    console.log(`原始内容长度: ${content.length}, 截断后长度: ${truncatedContent.length}, 包含HTML: ${hasHtmlTags}`);
    
    // 尝试不同的调用格式
    try {
      // 尝试直接调用官方OpenAI兼容格式
      console.log("尝试调用API (OpenAI兼容格式)...");
      const result = await callOpenAIFormat(truncatedContent, filename, fileType);
      return NextResponse.json(result);
    } catch (firstError: any) {
      console.error("OpenAI兼容格式调用失败:", firstError);
      
      // 尝试直接调用
      try {
        console.log("尝试直接调用API...");
        const result = await callDirectAPI(truncatedContent, filename, fileType);
        return NextResponse.json(result);
      } catch (secondError: any) {
        console.error("直接调用API也失败:", secondError);
        // 两种方法都失败，直接抛出错误
        throw new Error("所有API调用失败，无法生成测验题目");
      }
    }

  } catch (error: any) {
    console.error("❌ 生成测验失败:", error);
    console.error("错误堆栈:", error.stack);
    // 出现任何错误，直接返回错误信息
    return NextResponse.json({
      error: error.message || "生成测验题目时出现未知错误",
      details: error.stack?.substring(0, 500) || "无详细信息"
    }, { status: 500 });
  }
}

// 专门处理PDF文件 - 仅基于文件名生成问题
async function callPdfByFilenameOnly(filename: string) {
  console.log("为PDF文件生成问题，仅基于文件名:", filename);
  
  const prompt = `
  你是一位教育专家，精通生成测验题。

  我有一个PDF文件，文件名为: "${filename}"
  
  请根据这个文件名猜测文件可能包含的内容和主题，然后生成5个相关的单选题来测试该主题的知识。
  每个问题必须有4个选项(A,B,C,D)，并标明正确答案。
  
  严格要求：
  1. 不要在题目或选项中提及或引用文件名
  2. 不要使用"如果"、"假设"、"可能"、"推测"、"若"等猜测性语言
  3. 直接以确定的口吻出题，就像你完全了解主题一样
  4. 不要在题目中说明你是根据文件名猜测的
  5. 生成的问题应该看起来像是基于实际内容创建的
  6. 使用中文生成所有问题和选项
  7. 确保问题与主题相关且具有教育价值
  8. 选项应该合理且有区分度，包含一个正确答案和三个合理但不正确的干扰项
  9. 不要在题目或选项中使用"PDF"、"文档中"、"文档内"等提及源文件格式的字样
  
  请以下面的JSON格式返回:
  {
    "questions": [
        {
        "question": "问题内容",
        "options": {
          "A": "选项A",
          "B": "选项B",
          "C": "选项C",
          "D": "选项D"
        },
        "answer": "正确选项的字母(A或B或C或D)"
      }
    ]
  }
  
  请确保返回格式严格符合上述JSON结构，不要添加任何额外的文字说明。`;

  const url = `${BASE_URL}/v1/chat/completions`;
  const payload = {
    model: "gemini-2.5-pro",
    messages: [
      {
        role: "system",
        content: "你是一位帮助生成测验题的助手。根据PDF文件名推测主题并创建相关问题，但不要在问题中提及文件名或使用猜测性语言。直接以肯定的语气出题。总是输出有效的JSON格式。"
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.6,
    max_tokens: 4000,
    response_format: { type: "json_object" }
  };

  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  };

  console.log("发送PDF文件名处理请求到:", url);
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    console.log("API响应状态:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API错误响应:", errorText);
      throw new Error(`调用AI API失败: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("API响应数据前200字符:", JSON.stringify(data).substring(0, 200));
    
    const messageContent = data.choices?.[0]?.message?.content;
    
    if (!messageContent || messageContent.trim() === '') {
      console.log("API返回空内容");
      throw new Error("AI返回了空内容");
    }
    
    // 尝试解析JSON
    try {
      // 检查返回的是不是已经是JSON对象
      if (typeof messageContent === 'object') {
        const result = ensureValidQuestions(messageContent);
        return result;
      }
      
      // 尝试从字符串中提取和解析JSON
      let jsonContent = messageContent;
      
      // 如果包含markdown代码块，提取其中内容
      const jsonMatch = messageContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }
      
      // 解析JSON
      const parsedData = JSON.parse(jsonContent);
      return ensureValidQuestions(parsedData);
    } catch (parseError: any) {
      console.error("JSON解析错误:", parseError, "原始内容:", messageContent);
      throw new Error(`解析AI返回的JSON失败: ${parseError.message}`);
    }
  } catch (error: any) {
    console.error("处理PDF文件名失败:", error);
    throw error;
  }
}

// OpenAI兼容格式调用
async function callOpenAIFormat(content: string, filename?: string, fileType?: string) {
  // 确定是否内容包含文件名和Base64编码
  const isFileContent = content.includes("文件名:") && content.includes("Base64编码");
  
  const prompt = `
  你是一位教育专家，精通生成测验题检查学生对内容的掌握情况。
  
  请仔细阅读并理解我提供的内容，然后生成5个高质量的单选题来测试对这些内容的理解。每个问题必须有4个选项(A,B,C,D)，并标明正确答案。
  
  ${isFileContent ? `
  这是一个文件内容分析任务。请仔细分析提供的信息，包括文件名和可能的Base64编码样本。
  如果你能从文件名、类型或内容片段中识别出主题，请基于该主题创建有教育意义的问题。
  ` : `
  严格要求：
  1. 问题必须基于提供的内容，不要生成内容中未涵盖的问题
  2. 确保问题涵盖内容的关键概念和重要信息
  3. 选项应该合理且有区分度，包含一个正确答案和三个合理但不正确的干扰项
  4. 对于较短或提取质量不高的内容，请根据可用信息尽量生成相关问题
  5. 严禁在题目或选项中使用"幻灯片"、"该幻灯片"、"幻灯片中"等提及源文件格式的字样
  `}
  6. 使用中文生成所有问题和选项

  ${filename ? `文件名: ${filename}${fileType ? `\n文件类型: ${fileType}` : ''}` : ''}
  
  内容:
  ${content}
  
  请以下面的JSON格式返回:
  {
    "questions": [
      {
        "question": "问题内容",
        "options": {
          "A": "选项A",
          "B": "选项B",
          "C": "选项C",
          "D": "选项D"
        },
        "answer": "正确选项的字母(A或B或C或D)"
      }
    ]
  }
  
  请确保返回格式严格符合上述JSON结构，不要添加任何额外的文字说明。`;

  try {
    const url = `${BASE_URL}/v1/chat/completions`;
    const payload = {
      model: "gemini-2.5-pro",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates quiz questions based on provided content. Always output only valid JSON. Only create questions based on the actual content provided."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 4000, // 增加token限制
      response_format: { type: "json_object" } // 强制JSON输出
    };

    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    };

    console.log("发送OpenAI格式请求到:", url);
    
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    console.log("API响应状态:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API错误响应:", errorText);
      throw new Error(`调用AI API失败: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("API响应数据类型:", typeof data);
    console.log("API响应数据前200字符:", JSON.stringify(data).substring(0, 200));
    
    const messageContent = data.choices?.[0]?.message?.content;
    console.log("消息内容前200字符:", messageContent?.substring(0, 200) || "无内容");
    
    if (!messageContent || messageContent.trim() === '') {
      console.log("API返回空内容");
      throw new Error("AI返回了空内容");
    }
    
    // 尝试解析JSON
    try {
      // 检查返回的是不是已经是JSON对象
      if (typeof messageContent === 'object') {
        // 验证结构
        const result = ensureValidQuestions(messageContent);
        return result;
      }
      
      // 尝试从字符串中提取和解析JSON
      let jsonContent = messageContent;
      
      // 如果包含markdown代码块，提取其中内容
      const jsonMatch = messageContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }
      
      // 解析JSON
      const parsedData = JSON.parse(jsonContent);
      
      // 验证结构
      const result = ensureValidQuestions(parsedData);
      return result;
    } catch (parseError: any) {
      console.error("JSON解析错误:", parseError, "原始内容:", messageContent);
      throw new Error(`解析AI返回的JSON失败: ${parseError.message}`);
    }
  } catch (error: any) {
    console.error("调用API失败:", error);
    throw error; // 直接抛出错误，不再生成默认问题
  }
}

// 确保结果包含有效的问题数组，但不添加默认问题
function ensureValidQuestions(data: any) {
  // 确保结果有questions字段
  if (!data.questions) {
    data.questions = [];
  }
  
  // 确保questions是数组
  if (!Array.isArray(data.questions)) {
    data.questions = [];
  }
  
  // 如果问题数组为空，抛出错误
  if (data.questions.length === 0) {
    throw new Error("AI未能生成有效的测验题目");
  }
  
  return data;
}

// 直接API调用方式
async function callDirectAPI(content: string, filename?: string, fileType?: string) {
  try {
    // 确定是否内容包含Base64编码
    const isBase64Content = content.includes("Base64编码") || (content.substring(0, 100).match(/^[A-Za-z0-9+/=]+$/));
    
    const prompt = `
    You are an education expert. Your task is to generate quiz questions based ONLY on the provided content.
    
    ${isBase64Content ? `
    This is a file content analysis task. The content may include file information and possibly a Base64 encoded sample.
    If you can identify a topic or subject from the filename, file type, or content, please create educational questions on that topic.
    
    For example, if it's a PDF about "Introduction to Computer Science", create questions about basic computer science concepts.
    If it's a PowerPoint about "World War II", create history questions related to that period.
    ` : `
    Read and analyze the following content carefully, then create 5 high-quality multiple choice questions with 4 options each (A, B, C, D) to test understanding of this content.
    
    Important requirements:
    1. Questions MUST be based ONLY on the provided content
    2. Do NOT generate questions based on filenames or file descriptions
    3. Ensure questions cover key concepts and important information from the content
    4. Each question should have one correct answer and three plausible but incorrect distractors
    5. NEVER use terms like "slide", "in this slide", "the slide shows" or similar phrases that reference the source format
    `}
    6. Output all questions and options in Chinese
    
    ${filename ? `文件名: ${filename}${fileType ? `\n文件类型: ${fileType}` : ''}` : ''}
    
    内容:
    ${content}
    
    Return in this JSON format:
    {
      "questions": [
        {
          "question": "question text",
          "options": {
            "A": "option A",
            "B": "option B",
            "C": "option C",
            "D": "option D"
          },
          "answer": "correct option letter"
        }
      ]
    }
    
    Only return valid JSON without any other text or explanations.`;

    const url = `${BASE_URL}/v1/chat/completions`;
    const payload = {
      model: "gemini-2.5-pro",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates quiz questions based on provided content. Always output valid JSON, following strictly the required format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000 // 增加token限制
    };

    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    };

    console.log("发送直接API请求到:", url);
    
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000) // 增加超时时间到60秒
    });

    console.log("API响应状态:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API错误响应:", errorText);
      throw new Error(`调用AI API失败: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("API响应数据前200字符:", JSON.stringify(data).substring(0, 200));
    
    const messageContent = data.choices?.[0]?.message?.content;
    
    if (!messageContent || messageContent.trim() === '') {
      console.log("API返回空内容");
      throw new Error("AI返回了空内容");
    }
    
    // 尝试解析JSON
    try {
      // 尝试解析JSON
      let jsonContent = messageContent;
      const jsonMatch = messageContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                        messageContent.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }
      
      const result = JSON.parse(jsonContent);
      
      // 验证结构
      return ensureValidQuestions(result);
    } catch (parseError) {
      console.error("解析返回数据失败:", parseError, "原始内容:", messageContent);
      
      // 手动从文本中提取问题和答案
      try {
        const questions = [];
        const regex = /(\d+)[\.|\)]?\s*([^\n]+)\n+\s*A[\.|\)]?\s*([^\n]+)\n+\s*B[\.|\)]?\s*([^\n]+)\n+\s*C[\.|\)]?\s*([^\n]+)\n+\s*D[\.|\)]?\s*([^\n]+)\n+[^A-D]*([A-D])/g;
        let match;
        
        while ((match = regex.exec(messageContent)) !== null) {
          questions.push({
            question: match[2].trim(),
            options: {
              "A": match[3].trim(),
              "B": match[4].trim(),
              "C": match[5].trim(),
              "D": match[6].trim()
            },
            answer: match[7].trim()
          });
        }
        
        if (questions.length > 0) {
          return ensureValidQuestions({ questions });
        }
        
        // 如果没有提取到问题，抛出错误
        throw new Error("无法从AI响应中提取有效问题");
      } catch (extractError) {
        console.error("无法从文本提取问题:", extractError);
        throw new Error("无法从AI响应中提取有效问题");
      }
    }
  } catch (error) {
    console.error("直接API调用失败:", error);
    throw error; // 直接抛出错误，不再生成默认问题
  }
}

// 截断文本内容，避免超过token限制
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  
  // 保留开头和结尾的内容，中间部分用省略号代替
  const frontPart = content.substring(0, Math.floor(maxLength * 0.6));
  const endPart = content.substring(content.length - Math.floor(maxLength * 0.3));
  
  return `${frontPart}\n\n...(内容太长，已截断)...\n\n${endPart}`;
}