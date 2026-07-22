import Link from "next/link";

type LegalSection = {
  heading: string;
  paragraphs?: string[];
  items?: string[];
};

type LegalDocument = {
  title: string;
  eyebrow: string;
  updatedAt: string;
  intro: string[];
  sections: LegalSection[];
};

const updatedAt = "2026年7月2日";

export const legalDocuments = {
  terms: {
    title: "用户协议",
    eyebrow: "使用规则与服务边界",
    updatedAt,
    intro: [
      "欢迎使用善缘阁。请您在使用心愿供灯、今日黄历、求签、八字精批、周公解梦、手相/面相、宝宝起名、六爻占卜、静心禅坐等功能前，仔细阅读本协议。",
      "继续访问、提交信息、发起服务或完成支付，即表示您已理解并同意本协议、《隐私说明》与《AI 生成说明》。如您不同意，请停止使用相关功能。",
    ],
    sections: [
      {
        heading: "一、服务性质",
        items: [
          "本站内容以传统文化整理、民俗体验、情绪陪伴和灵感参考为目的，不构成医疗、心理、法律、投资、婚恋、教育升学、职业规划等专业意见。",
          "黄历、八字、签文、解梦、起名、手相/面相、六爻等结果具有文化阐释和娱乐参考属性，不应作为您作出重大现实决策的唯一依据。",
          "因地域习俗、流派口径、历法算法、模型生成和用户输入差异，结果可能存在差异或不完整之处，请结合实际情况理性判断。",
        ],
      },
      {
        heading: "二、使用资格",
        items: [
          "本站面向具备完全民事行为能力的成年人提供服务。未满18周岁请勿使用付费、占卜、图像分析或需要提交个人信息的功能。",
          "如您代表他人提交姓名、生辰、照片、梦境、心愿等信息，应确保已取得对方授权，并尊重其隐私、人格权益和肖像权益。",
        ],
      },
      {
        heading: "三、账号与本地身份",
        items: [
          "当前项目可能通过匿名用户标识、浏览器本地存储或订单记录保存您的基础使用状态，用于展示历史结果、心愿灯数量、订单状态等功能。",
          "请妥善保管您设备和浏览器环境。因您主动分享页面、截图、链接或将设备交由他人使用导致的信息泄露，由您自行承担相应后果。",
        ],
      },
      {
        heading: "四、付费服务与退款",
        items: [
          "部分功能可能设置供奉、解锁、精批、图片分析、起名等付费项目。具体价格、权益、服务内容以页面展示和订单确认为准。",
          "测试环境或沙箱支付不会产生真实交易；正式上线后的真实支付应以接入的支付渠道订单为准。",
          "数字化内容通常会在支付确认后即时生成。除法律规定、页面特别说明或服务确有重大故障外，已生成的数字内容原则上不支持无理由撤销。",
          "如发生重复扣款、金额异常、服务未交付等问题，请通过站内反馈或运营方公布的联系方式提交订单信息，我们会核验后处理。",
        ],
      },
      {
        heading: "五、用户行为规范",
        items: [
          "您不得提交违法违规、侵权、虚假冒名、骚扰诽谤、色情低俗、暴力恐怖、迷信诈骗、诱导自伤自杀、侵犯未成年人权益或危害公共安全的内容。",
          "您不得上传未经授权的人脸、掌纹、证件、病历、聊天记录、住址、联系方式等敏感资料，也不得利用本站生成、传播误导性内容或实施欺诈。",
          "您不得逆向工程、批量抓取、攻击接口、绕过付费、破坏服务稳定性，或将本站结果包装成确定性承诺对外销售。",
        ],
      },
      {
        heading: "六、内容权利",
        items: [
          "本站页面设计、文案、算法配置、数据整理、图像素材、生成模板等内容受相关法律保护。未经授权，不得复制、改编、批量转载或用于商业用途。",
          "您保留对自己合法提交内容的相应权利。为提供服务，您授权本站在必要范围内对您提交的内容进行处理、分析、脱敏展示、结果生成和安全审核。",
          "心愿灯墙等公开展示区域会对姓名或称呼进行脱敏处理。请勿在公开字段中填写完整手机号、身份证号、住址等敏感信息。",
        ],
      },
      {
        heading: "七、服务变更与中断",
        items: [
          "我们可能基于产品优化、合规要求、模型升级、接口调整、维护故障或安全风控，对功能、价格、展示样式、数据接口进行调整。",
          "因网络、第三方服务、浏览器兼容、设备环境、不可抗力等原因造成服务延迟、中断或结果未能生成，我们会尽力修复，但不承诺服务永不间断。",
        ],
      },
      {
        heading: "八、免责声明与责任限制",
        items: [
          "本站不保证所有内容完全准确、适合您的个人情况或满足您的特定目的。您应对基于本站内容作出的行为和决策承担责任。",
          "如您因违反本协议、侵犯他人权益或提交违法内容导致投诉、纠纷、处罚或损失，应自行承担责任，并使本站免受因此产生的不利影响。",
          "在法律允许范围内，本站对间接损失、预期收益损失、数据丢失、情绪影响或第三方行为不承担超出服务费用本身的责任。",
        ],
      },
      {
        heading: "九、协议更新与联系",
        items: [
          "我们可能根据功能变化、法律法规或运营需要更新本协议，并在页面标注最近更新时间。更新后继续使用，即视为接受更新内容。",
          "如您对本协议、订单、内容或个人信息处理有疑问，请通过站内反馈入口或运营方公布的联系方式与我们联系。",
        ],
      },
    ],
  },
  privacy: {
    title: "隐私说明",
    eyebrow: "个人信息处理与保护",
    updatedAt,
    intro: [
      "善缘阁重视您的个人信息和隐私保护。本说明解释我们在提供传统文化参考、心愿供灯、命理解析、图片分析、起名、解梦等功能时，可能如何收集、使用、保存和保护您的信息。",
      "我们遵循合法、正当、必要和诚信原则，尽量只收集实现功能所必需的信息，并采取合理措施保护数据安全。",
    ],
    sections: [
      {
        heading: "一、我们可能收集的信息",
        items: [
          "基础使用信息：匿名用户标识、浏览器本地存储标识、访问页面、功能点击、订单状态、支付确认记录、错误日志等。",
          "您主动提交的信息：姓名或称呼、生辰日期和时辰、性别、关系、心愿内容、梦境描述、起名偏好、问题描述、上传的掌心照或面部照等。",
          "设备与网络信息：浏览器类型、设备类型、页面性能、接口请求时间、IP相关的粗略网络信息等，用于安全风控和故障排查。",
          "公开展示信息：心愿灯墙等区域会展示经脱敏处理的姓氏、称呼、供奉对象、灯型和供奉记录，不展示完整姓名或敏感联系方式。",
        ],
      },
      {
        heading: "二、我们如何使用信息",
        items: [
          "提供、生成和保存您请求的服务结果，例如黄历、签文、八字、解梦、起名、六爻、手相/面相分析、供灯记录等。",
          "完成订单确认、权益解锁、售后核验、异常排查、反作弊和安全防护。",
          "优化页面体验、改进功能逻辑、修复接口错误、统计匿名化运营数据。",
          "在您同意或法律允许的范围内，用于必要的客服沟通、投诉处理、争议处理和合规审计。",
        ],
      },
      {
        heading: "三、AI与第三方服务处理",
        items: [
          "部分功能可能调用大模型、图片识别、历法数据、支付接口、云存储或安全服务。我们会尽量只向第三方服务提供完成该功能所需的最少信息。",
          "请避免在输入框或图片中提交身份证号、银行卡号、精确住址、病例、未成年人照片、他人隐私等高度敏感信息。",
          "当模型或第三方接口不可用时，系统可能使用本地规则、缓存数据或提示稍后再试，以保证页面体验和服务稳定性。",
        ],
      },
      {
        heading: "四、本地存储与Cookie",
        items: [
          "为了记住匿名用户状态、历史结果、心愿灯数量、订单解锁状态等，本站可能使用 Cookie、localStorage 或同类本地存储技术。",
          "您可以通过浏览器设置清理本地数据。清理后，部分历史记录、解锁状态或个性化展示可能无法继续保留。",
        ],
      },
      {
        heading: "五、信息保存期限",
        items: [
          "我们会在实现服务目的所需的期限内保存相关信息，例如订单核验、历史结果查看、安全审计和投诉处理所需的期限。",
          "对于不再需要的个人信息，我们会按实际技术条件删除、匿名化或停止继续使用。法律法规要求另行保存的，从其规定。",
        ],
      },
      {
        heading: "六、信息安全",
        items: [
          "我们会采用访问控制、日志审计、接口鉴权、脱敏展示、传输加密等合理措施保护信息安全。",
          "互联网环境并非绝对安全。请您谨慎填写个人信息，避免在公共设备或不可信网络环境中提交敏感内容。",
        ],
      },
      {
        heading: "七、您的权利",
        items: [
          "您可以请求查询、复制、更正、补充、删除您的个人信息，或撤回部分授权、注销相关匿名记录、要求解释个人信息处理规则。",
          "如您发现公开展示内容涉及隐私、冒名或侵权，可提交删除或更正请求。我们核验后会在合理期限内处理。",
          "法律法规另有规定、涉及安全审计、争议处理或履行法定义务的，我们可能无法立即删除全部信息，但会向您说明原因。",
        ],
      },
      {
        heading: "八、未成年人保护",
        items: [
          "本站不面向未满18周岁用户提供付费占卜、命理精批、图像分析等服务。未成年人请在监护人指导下浏览普通公开内容，并避免提交个人信息。",
          "如监护人发现未成年人未经同意提交了个人信息，可联系我们请求删除或限制处理。",
        ],
      },
      {
        heading: "九、说明更新与联系",
        items: [
          "我们可能因功能调整、第三方服务变化或法律法规要求更新本说明，并在页面标注最近更新时间。",
          "如您对隐私处理有疑问、投诉或权利请求，请通过站内反馈入口或运营方公布的联系方式与我们联系。",
        ],
      },
    ],
  },
  ai: {
    title: "AI 生成说明",
    eyebrow: "生成内容的使用边界",
    updatedAt,
    intro: [
      "善缘阁的部分功能会结合传统资料、规则算法、结构化模板与大模型能力生成内容。本说明帮助您理解 AI 辅助内容的来源、局限和正确使用方式。",
      "AI 生成内容用于传统文化参考、文字整理和灵感启发，不代表确定事实、专业诊断或必然结果。",
    ],
    sections: [
      {
        heading: "一、哪些功能可能使用AI",
        items: [
          "八字精批、宝宝起名、姓名测评、周公解梦、求签详解、六爻占卜、手相/面相分析等功能，可能使用 AI 对传统规则和用户输入进行组织、扩写和解释。",
          "图片类功能可能使用图像识别能力提取可见特征，再生成文字化参考说明。请确保图片清晰且您有权上传。",
          "心愿供灯、黄历、签文、灯墙展示等功能也可能使用规则算法或本地数据库，不一定每次都调用 AI。",
        ],
      },
      {
        heading: "二、AI内容如何产生",
        items: [
          "系统会根据您填写的生辰、姓名、梦境、问题、图片或偏好，结合页面设定的提示词、传统资料标签、结构化字段和安全规则生成结果。",
          "部分页面会优先使用权威历法数据、本地签文库、固定规则或脱敏展示逻辑；AI 主要负责解释、归纳、润色和个性化表达。",
          "当生成较慢、服务繁忙或安全策略限制生成时，系统可能返回本地参考结果、提示稍后重试，或减少个性化内容。",
        ],
      },
      {
        heading: "三、AI的局限",
        items: [
          "AI 可能出现理解偏差、遗漏、重复、事实错误、表达过度肯定或与传统流派不完全一致的情况。",
          "命理、占卜、解梦、相学和起名本身存在不同流派与解释口径，AI 不能保证结果唯一、准确或适合每个人。",
          "AI 不具备真实预测未来、诊断疾病、判断法律责任、保证婚恋结果、保证财富收益或替代专业人士的能力。",
        ],
      },
      {
        heading: "四、请您理性使用",
        items: [
          "请把 AI 生成内容视为文化参考和思考材料，不要将其作为医疗治疗、心理危机处理、投资交易、诉讼决策、婚姻去留等重大事项的依据。",
          "如涉及身心健康、法律纠纷、财务投资、未成年人教育、家庭暴力、自伤自杀风险等紧急或专业问题，请及时联系相应专业机构或可信赖的人。",
          "请勿故意诱导 AI 生成违法违规、侵犯他人权益、恐吓诈骗、迷信敛财、歧视攻击或误导公众的内容。",
        ],
      },
      {
        heading: "五、隐私与输入提醒",
        items: [
          "请尽量使用必要信息完成服务，不要输入身份证号、银行卡号、精确住址、完整病历、私密聊天记录、他人照片等高度敏感内容。",
          "公开展示区域会尽量脱敏，但您主动写入公开字段的敏感信息仍可能被他人看到。提交前请自行检查。",
          "上传人脸、掌纹或他人相关资料前，请确保您拥有合法授权，并理解图片分析结果仅为参考。",
        ],
      },
      {
        heading: "六、内容安全与反馈",
        items: [
          "我们会通过提示词约束、接口风控、敏感内容过滤和必要的人工处理流程，尽力降低不当生成内容的风险。",
          "若您发现内容明显错误、冒犯、涉隐私、涉侵权或存在安全风险，请通过站内反馈入口提交页面、时间和问题描述，我们会评估并处理。",
          "我们可能根据反馈、合规要求和模型升级持续调整生成策略、展示方式和安全规则。",
        ],
      },
      {
        heading: "七、标识与透明度",
        items: [
          "当页面结果主要由 AI 辅助生成时，我们会在相关入口、协议或说明中提示其生成属性。",
          "为避免干扰用户体验，具体页面不会展示内部模型报错、供应商故障或调试信息；但这不影响您了解相关内容可能由 AI 辅助生成。",
        ],
      },
    ],
  },
} satisfies Record<"terms" | "privacy" | "ai", LegalDocument>;

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="返回首页">
      <img src="/favicon.svg" alt="善缘阁" className="size-8" />
      <span className="font-display text-lg tracking-[0.15em] text-gold">善缘阁</span>
    </Link>
  );
}

export function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <div className="min-h-screen bg-xuan text-paper-dark">
      <header className="fixed top-0 inset-x-0 z-50 pt-[9px] bg-xuan/85 backdrop-blur-md">
        <div className="mx-auto flex h-[54px] max-w-6xl items-center justify-between px-4">
          <Logo />
          <Link
            href="/"
            className="rounded-full border border-gold/25 px-4 py-2 text-sm text-gold/80 transition-colors hover:border-gold/50 hover:bg-gold/10 hover:text-gold"
          >
            返回首页
          </Link>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-28">
        <section className="text-center">
          <p className="text-sm tracking-[0.24em] text-gold/60">{document.eyebrow}</p>
          <h1 className="mt-4 font-display text-4xl tracking-widest text-gold md:text-5xl">
            {document.title}
          </h1>
          <p className="mt-4 text-sm text-paper-dark/45">最近更新：{document.updatedAt}</p>
          <div className="mx-auto mt-8 max-w-2xl space-y-3 text-left text-base leading-8 text-paper-dark/70 md:text-center">
            {document.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <article className="mt-12 space-y-5">
          {document.sections.map((section) => (
            <section
              key={section.heading}
              className="rounded-lg border border-gold/18 bg-ink/35 px-5 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] md:px-7"
            >
              <h2 className="font-display text-xl tracking-[0.12em] text-gold/90">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 leading-8 text-paper-dark/70">
                  {paragraph}
                </p>
              ))}
              {section.items && (
                <ul className="mt-4 space-y-3 leading-8 text-paper-dark/68">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-[0.78em] size-1.5 shrink-0 rounded-full bg-gold/65" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        <nav className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link href="/terms" className="rounded-full border border-gold/20 px-4 py-2 text-gold/75 hover:bg-gold/10">
            用户协议
          </Link>
          <Link href="/privacy" className="rounded-full border border-gold/20 px-4 py-2 text-gold/75 hover:bg-gold/10">
            隐私说明
          </Link>
          <Link href="/ai" className="rounded-full border border-gold/20 px-4 py-2 text-gold/75 hover:bg-gold/10">
            AI 生成说明
          </Link>
        </nav>
      </main>
    </div>
  );
}
