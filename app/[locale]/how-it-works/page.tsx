import Link from 'next/link';
import {
  UserPlus,
  PlusCircle,
  Users,
  CheckCircle,
  FileText,
  ThumbsUp,
  AlertTriangle,
  Scale,
  Star,
  Wallet,
  Clock,
  ShieldCheck,
  Zap,
  MessageSquare,
  RefreshCw,
  Lock,
  ChevronRight,
} from 'lucide-react';

type Locale = 'ka' | 'en';

const content = {
  ka: {
    title: 'როგორ მუშაობს Tasky',
    subtitle:
      'სრული გზამკვლევი — ნაბიჯ-ნაბიჯ, ყველა სცენარი, ყველა მნიშვნელოვანი დეტალი.',
    backHome: '← მთავარი',

    overviewTitle: 'პლატფორმის ლოგიკა',
    overviewText:
      'Tasky უსაფრთხო ბაზარია, სადაც დამკვეთები (CLIENT) ასახელებენ ტასკებს, ხოლო შემსრულებლები (WORKER) ასრულებენ მათ. გადასახადი იბლოკება ესკროუ-ბალანსზე და მხოლოდ მტკიცებულების (evidence) დამტკიცების შემდეგ გადადის შემსრულებელზე.',

    clientTitle: 'დამკვეთი (CLIENT)',
    workerTitle: 'შემსრულებელი (WORKER)',

    clientSteps: [
      {
        icon: 'UserPlus',
        title: 'რეგისტრაცია',
        body: 'გახსენი ანგარიში ელ-ფოსტით. რეგისტრაცია უფასოა. შენი Tasky-ბალანსი ავტომატურად იქმნება.',
      },
      {
        icon: 'PlusCircle',
        title: 'ტასკის შექმნა',
        body: 'გადადი „ჩემი დადებული ტასკები" → „ახალი ტასკი". შეავსე: სათაური, სრული აღწერა, ბიუჯეტი (ჯილდო), ვადა (deadline) და ტიპი.',
        note: 'ტასკის გამოქვეყნებისას სერვისის საკომისიო (publish fee) ჩამოიჭრება შენი ბალანსიდან ავტომატურად. ბალანსი უნდა იყოს საკმარისი.',
      },
      {
        icon: 'Zap',
        title: 'ტასკის ტიპი: ექსკლუზიური vs ღია',
        body: null,
        subItems: [
          {
            label: 'ექსკლუზიური (exclusive)',
            text: 'შემსრულებელი გზავნის განაცხადს — შენ განიხილავ და ერთ-ერთს ამტკიცებ. დამტკიცებისთანავე ჩატი იხსნება ავტომატურად. სხვა განმცხადებლები ვეღარ ნახავენ ტასკს.',
          },
          {
            label: 'ღია (open)',
            text: 'ნებისმიერ შემსრულებელს შეუძლია ტასკი სწრაფად "დაიჭიროს" (claim) — განხილვის გარეშე. პირველი claim-ი ქმნის სამუშაო სივრცეს.',
          },
        ],
      },
      {
        icon: 'MessageSquare',
        title: 'ჩატი',
        body: 'ექსკლუზიურ ტასკზე განაცხადის დამტკიცების შემდეგ ჩატ-სქემა ავტომატურად ეხსნება. გამოიყენე ვრცელი კომუნიკაციისთვის — ტასკის დაზუსტება, კითხვები, ფაილები.',
      },
      {
        icon: 'FileText',
        title: 'მტკიცებულების (Evidence) მიღება',
        body: 'შემსრულებელი ატვირთავს მტკიცებულებას — ტექსტი, ფოტოები, ვიდეო, ფაილები. შენ (owner) ამ ინფორმაციას ხედავ ჩატ-პანელში (ასევე Proofs-გვერდზე).',
      },
      {
        icon: 'ThumbsUp',
        title: 'მტკიცებულების განხილვა — 3 ვარიანტი',
        body: null,
        subItems: [
          {
            label: '✅ დამტკიცება (Approve)',
            text: 'თანხა (ჯილდო) ავტომატურად გადადის შემსრულებელზე. ორივე მხარეს შეუძლია შეაფასოს ერთ-ერთი.',
          },
          {
            label: '⚠️ ხარვეზი (Needs Fixes)',
            text: 'მიუთითე, რა უნდა გამოასწოროს შემსრულებელმა. მას ეძლევა 96 საათი (4 დღე) ხელახლა შესაქმნელად. Needs-Fixes შეიძლება გაიგზავნოს მხოლოდ ერთხელ ერთ task+worker წყვილზე.',
          },
          {
            label: '⚖️ დავის დაწყება (Dispute)',
            text: 'თუ შეთანხმებამდე ვერ მივედი — გახსენი დავა. ეს შეიძლება მხოლოდ PENDING (ანუ გადაუწყვეტელ) მტკიცებულებაზე.',
          },
        ],
        note: 'თუ 7 დღე არ გამოეხმაურე, სისტემა ავტომატურად ამტკიცებს (auto-approve) და თანხა გადადის შემსრულებელზე.',
      },
      {
        icon: 'Star',
        title: 'შეფასება',
        body: 'დამტკიცების (ან დავის გადაწყვეტის) შემდეგ შეაფასე შემსრულებელი 1–5 ვარსკვლავით. შეფასება ნებაყოფლობითია.',
      },
    ],

    workerSteps: [
      {
        icon: 'UserPlus',
        title: 'რეგისტრაცია',
        body: 'გახსენი ანგარიში ელ-ფოსტით. შენი Tasky-ბალანსი ავტომატურად იქმნება.',
      },
      {
        icon: 'Users',
        title: 'ტასკის ძებნა და აღება',
        body: null,
        subItems: [
          {
            label: 'ექსკლუზიური ტასკი',
            text: 'გააგზავნე განაცხადი (apply). დამკვეთი განიხილავს — დამტკიცების შემდეგ ჩატი გაიხსნება. განაცხადების გათიშვამდე მანამდე შეგიძლია ნახო ტასკის ძირითადი ინფო.',
          },
          {
            label: 'ღია ტასკი',
            text: 'დააჭირე „Claim" — ტასკი პირდაპირ გადადის შენ სამუშაო სივრცეში განხილვის გარეშე.',
          },
        ],
      },
      {
        icon: 'FileText',
        title: 'მტკიცებულების გამოგზავნა',
        body: 'გადადი Workspace-ში (ან „ჩემი აღებული ტასკები") და ატვირთე evidence — ტექსტი, ფოტოები (Cloudinary), ვიდეო, ZIP ფაილები. გაგზავნამდე შეამოწმე, რომ ყველაფერი სრულია.',
      },
      {
        icon: 'RefreshCw',
        title: 'ხელახლა გაგზავნა (Resubmit)',
        body: 'თუ დამკვეთმა Needs Fixes დააბრუნა — შენ გაქვს 96 საათი ახალი evidence-ის გასაგზავნად (fixFor ბმული ძველ evidence-ს ავტომატურად ეკვრება). ვადის გასვლის შემდეგ evidence-ი EXPIRED სტატუსს მიიღებს.',
        note: 'Needs-Fixes resubmit-ის შემდეგ 96-საათიანი countdown ავტომატურად ჩერდება.',
      },
      {
        icon: 'Scale',
        title: 'დავა (Dispute)',
        body: 'გაქვს უფლება გახსნა დავა, თუ დამკვეთი არ გიდასტურებს მტკიცებულებას. ყურადღება: WORKER-ს არ შეუძლია გახსნა დავა საკუთარ evidence-ზე — მხოლოდ CLIENT-ს.',
        note: 'დავა შეიძლება გაიხსნოს მხოლოდ PENDING სტატუსის evidence-ზე.',
      },
      {
        icon: 'Wallet',
        title: 'გადახდა',
        body: 'დამტკიცებისთანავე (ან auto-approve/dispute-resolve-ის შემდეგ) ჯილდო ჩაირიცხება შენს Tasky-ბალანსში. შეგიძლია ნახო Balance-გვერდზე.',
      },
      {
        icon: 'Star',
        title: 'შეფასება',
        body: 'დასრულებული ტასკის შემდეგ შეაფასე დამკვეთი 1–5 ვარსკვლავით. ორმხრივი შეფასება ეხმარება პლატფორმის ნდობის სისტემის განვითარებას.',
      },
    ],

    deadlineTitle: 'ვადები (Deadlines)',
    deadlineItems: [
      {
        icon: 'Clock',
        title: 'ტასკის deadline',
        body: 'ტასკის deadline-ი ასახავს, სანამ ტასკი "ახალი"-ად ჩანს ფიდში. ვადაგასულ ტასკს EXPIRED სტატუსი ემატება. deadline-ის გახანგრძლივება შესაძლებელია პარამეტრებიდან.',
      },
      {
        icon: 'Clock',
        title: 'Needs Fixes — 96 საათი',
        body: 'Needs Fixes გაგზავნის მომენტიდან შემსრულებელს ეძლევა ზუსტად 96 საათი (4 დღე) ახალი მტკიცებულების გასაგზავნად. ამ ვადის გადაცდენა evidence-ს EXPIRED ხდის. resubmit-ის შემდეგ countdown ჩერდება.',
      },
      {
        icon: 'Clock',
        title: 'Dispute — 4 დღე',
        body: 'მეორე მხარეს დავის შემდეგ ეძლევა 4 დღე საკუთარი პოზიციის წარსადგენად. ვადის გასვლის შემდეგ ადმინი გადაწყვეტს ხელმისაწვდომი ინფორმაციის საფუძველზე.',
      },
      {
        icon: 'Clock',
        title: 'Auto-Approve — 7 დღე',
        body: '7 დღის განმავლობაში უპასუხო (PENDING) evidence-ი ავტომატურად APPROVED სტატუსს იღებს. ეს გვიცავს სიტუაციებისგან, სადაც დამკვეთი გვერდს ვერ შეამოწმებს.',
      },
    ],

    disputeTitle: 'დავის (Dispute) სრული ალგორითმი',
    disputeSteps: [
      { step: '1', text: 'CLIENT ან WORKER (მხოლოდ CLIENT) ხსნის დავას — წერს ტექსტს, ამატებს ფოტო/ვიდეო/ფაილებს.' },
      { step: '2', text: 'მეორე მხარეს (WORKER) ეძლევა 4 დღე საკუთარი პოზიციის გამოქვეყნებისთვის.' },
      { step: '3', text: 'ADMIN განიხილავს ორივე მხარის მასალებს.' },
      { step: '4', text: 'ADMIN იღებს გადაწყვეტილებას: CLIENT იგებს / WORKER იგებს / SPLIT (პროცენტული გადანაწილება).' },
      { step: '5', text: 'თანხა ავტომატურად ნაწილდება ადმინის გადაწყვეტილების მიხედვით.' },
    ],
    disputeNote: 'დავა შეიძლება გაიხსნოს მხოლოდ PENDING evidence-ზე. APPROVED ან NEEDS_FIXES evidence-ზე დავის გახსნა ბლოკირებულია.',

    financeTitle: 'ფინანსები და ბალანსი',
    financeItems: [
      {
        icon: 'Lock',
        title: 'ესკრო-ბალანსი',
        body: 'ჯილდო (reward) სახელდება ტასკის შექმნისას. ის გადადის შემსრულებლის ბალანსზე მხოლოდ evidence-ის დამტკიცების შემდეგ.',
      },
      {
        icon: 'Wallet',
        title: 'საკომისიო (Commission)',
        body: 'სერვისი აიღებს გარკვეულ პროცენტს (საკომისიო) გამოქვეყნების დროს (publish fee). თითოეული მომხმარებლის საკომისიო პროცენტი ინდივიდუალურია.',
      },
      {
        icon: 'ShieldCheck',
        title: 'Dispute-ის SPLIT',
        body: 'SPLIT გადაწყვეტილების შემთხვევაში ადმინი განსაზღვრავს CLIENT და WORKER-ის წილს (%). თანხა ავტომატურად ნაწილდება შესაბამის ბალანსებზე.',
      },
    ],

    tipsTitle: 'სასარგებლო რჩევები',
    tips: [
      'ტასკის აღწერა დაწერე ზუსტად — ბუნდოვანი მოთხოვნები დავებს იწვევს.',
      'ჩატი გამოიყენე ნებისმიერი გაუგებრობის დასაზუსტებლად მუშაობის დაწყებამდე.',
      'Evidence-ის გამოგზავნამდე დარწმუნდი, რომ ყველა ფაილი სწორად ატვირთა.',
      '7-დღიანი auto-approve-ის გამო, evidence-ის მიღებისთანავე გამოეხმაურე — ან დაადასტურე, ან დაბრუნე.',
      'Needs Fixes-ის 96-საათიანი ვადა ითვლება გაგზავნის მომენტიდან — გახსოვდეს.',
      'დავის გახსნისას დართე მაქსიმალური მასალა: ფოტო, ვიდეო, ტექსტი.',
    ],

    ctaTitle: 'მზად ხარ?',
    ctaBody: 'გახსენი ანგარიში და გამოსცადე Tasky — ადვილი, სწრაფი, სამართლიანი.',
    ctaBtn: 'დაიწყე ახლა',
    ctaBtnSecondary: 'ტასკების ნახვა',
  },

  en: {
    title: 'How Tasky Works',
    subtitle:
      'A complete step-by-step guide — every scenario, every important detail explained.',
    backHome: '← Home',

    overviewTitle: 'Platform Overview',
    overviewText:
      'Tasky is a secure task marketplace where Clients post tasks and Workers complete them. The payment (reward) is held in an escrow-like balance and is released only after the Client approves the submitted evidence.',

    clientTitle: 'Client (Task Poster)',
    workerTitle: 'Worker (Task Taker)',

    clientSteps: [
      {
        icon: 'UserPlus',
        title: 'Create an Account',
        body: 'Sign up with your email address. Registration is free. Your Tasky balance is created automatically.',
      },
      {
        icon: 'PlusCircle',
        title: 'Post a Task',
        body: 'Go to "My Tasks" → "New Task". Fill in: title, full description, reward amount, deadline, and task type.',
        note: 'A publish fee (service commission) is automatically deducted from your balance when you publish a task. Make sure your balance is sufficient.',
      },
      {
        icon: 'Zap',
        title: 'Task Type: Exclusive vs Open',
        body: null,
        subItems: [
          {
            label: 'Exclusive',
            text: 'Workers send applications — you review them and approve one. A chat thread opens automatically after approval. Other applicants can no longer see the task.',
          },
          {
            label: 'Open',
            text: 'Any worker can instantly "claim" the task without review. The first claim creates a workspace.',
          },
        ],
      },
      {
        icon: 'MessageSquare',
        title: 'Chat',
        body: 'After approving an application on an exclusive task, a chat thread opens automatically. Use it to clarify requirements, ask questions, and share files before work begins.',
      },
      {
        icon: 'FileText',
        title: 'Receiving Evidence',
        body: 'The worker uploads their evidence — text, photos, video, and files. You (the owner) see this in the chat panel and in the Proofs page.',
      },
      {
        icon: 'ThumbsUp',
        title: 'Reviewing Evidence — 3 Options',
        body: null,
        subItems: [
          {
            label: '✅ Approve',
            text: 'The reward transfers automatically to the worker. Both parties can then leave a star rating.',
          },
          {
            label: '⚠️ Needs Fixes',
            text: 'Specify what the worker needs to fix. They get 96 hours (4 days) to resubmit. Needs Fixes can only be sent once per task+worker pair.',
          },
          {
            label: '⚖️ Open a Dispute',
            text: 'If you cannot reach an agreement — open a dispute. This is only possible on PENDING (unresolved) evidence.',
          },
        ],
        note: 'If you do not respond within 7 days, the system auto-approves the evidence and releases the payment to the worker.',
      },
      {
        icon: 'Star',
        title: 'Rating',
        body: 'After approval (or dispute resolution), rate the worker from 1 to 5 stars. Ratings are optional but help build platform trust.',
      },
    ],

    workerSteps: [
      {
        icon: 'UserPlus',
        title: 'Create an Account',
        body: 'Sign up with your email address. Your Tasky balance is created automatically.',
      },
      {
        icon: 'Users',
        title: 'Find and Take a Task',
        body: null,
        subItems: [
          {
            label: 'Exclusive Task',
            text: 'Send an application (apply). The client reviews it — after approval, a chat thread opens. You can see the task details before deciding to apply.',
          },
          {
            label: 'Open Task',
            text: 'Click "Claim" — the task goes directly to your workspace without any review.',
          },
        ],
      },
      {
        icon: 'FileText',
        title: 'Submit Evidence',
        body: 'Go to your Workspace (or "My Taken Tasks") and upload your evidence — text, photos (via Cloudinary), video, and ZIP files. Double-check everything before submitting.',
      },
      {
        icon: 'RefreshCw',
        title: 'Resubmit (after Needs Fixes)',
        body: 'If the client sends a Needs Fixes request — you have 96 hours to send new evidence (a fixFor link automatically connects it to the previous submission). Missing the deadline sets the evidence to EXPIRED status.',
        note: 'After you resubmit, the 96-hour countdown stops automatically.',
      },
      {
        icon: 'Scale',
        title: 'Opening a Dispute',
        body: 'Workers cannot open a dispute on their own evidence — only the CLIENT can initiate a dispute. However, after a CLIENT opens one, the WORKER responds with their side of the story.',
        note: 'A dispute can only be opened on PENDING evidence.',
      },
      {
        icon: 'Wallet',
        title: 'Getting Paid',
        body: 'As soon as the evidence is approved (or after auto-approve / dispute resolution), the reward is credited to your Tasky balance. Check it on the Balance page.',
      },
      {
        icon: 'Star',
        title: 'Rating',
        body: 'After a completed task, rate the client from 1 to 5 stars. Mutual ratings help grow the platform\'s trust system.',
      },
    ],

    deadlineTitle: 'Deadlines — All Details',
    deadlineItems: [
      {
        icon: 'Clock',
        title: 'Task Deadline',
        body: 'The task deadline indicates how long the task appears as "new" in the feed. Expired tasks receive an EXPIRED status. The deadline can be extended from the task settings.',
      },
      {
        icon: 'Clock',
        title: 'Needs Fixes — 96 Hours',
        body: 'From the moment Needs Fixes is sent, the worker has exactly 96 hours (4 days) to submit new evidence. Missing this window sets the evidence to EXPIRED. The countdown stops automatically after a successful resubmit.',
      },
      {
        icon: 'Clock',
        title: 'Dispute Response — 4 Days',
        body: 'After a dispute is opened, the other party has 4 days to submit their position. After the deadline, the admin resolves the case based on available information.',
      },
      {
        icon: 'Clock',
        title: 'Auto-Approve — 7 Days',
        body: 'A PENDING evidence that receives no response for 7 days is automatically approved. This protects workers from clients who go inactive.',
      },
    ],

    disputeTitle: 'Full Dispute Algorithm',
    disputeSteps: [
      { step: '1', text: 'CLIENT opens a dispute — submits text, photos, video, and/or files as evidence.' },
      { step: '2', text: 'WORKER has 4 days to submit their side of the story.' },
      { step: '3', text: 'ADMIN reviews both parties\' submissions.' },
      { step: '4', text: 'ADMIN decides: CLIENT wins / WORKER wins / SPLIT (percentage-based distribution).' },
      { step: '5', text: 'Funds are automatically distributed according to the admin\'s decision.' },
    ],
    disputeNote: 'A dispute can only be opened on PENDING evidence. Opening a dispute on APPROVED or NEEDS_FIXES evidence is blocked.',

    financeTitle: 'Finances & Balance',
    financeItems: [
      {
        icon: 'Lock',
        title: 'Escrow Balance',
        body: 'The reward amount is set when creating the task. It transfers to the worker\'s balance only after the evidence is approved.',
      },
      {
        icon: 'Wallet',
        title: 'Commission',
        body: 'The service takes a percentage (commission) at the time of publishing (publish fee). Each user\'s commission rate is set individually.',
      },
      {
        icon: 'ShieldCheck',
        title: 'Dispute SPLIT',
        body: 'In a SPLIT decision, the admin sets the percentage for CLIENT and WORKER. Funds are automatically distributed to the respective balances.',
      },
    ],

    tipsTitle: 'Helpful Tips',
    tips: [
      'Write task descriptions precisely — vague requirements lead to disputes.',
      'Use chat to clarify any ambiguity before starting work.',
      'Before submitting evidence, make sure all files uploaded correctly.',
      'Due to 7-day auto-approve, respond to received evidence quickly — either approve or return it.',
      'The 96-hour Needs Fixes countdown starts from the moment it is sent — keep track.',
      'When opening a dispute, attach as much supporting material as possible: photos, video, text.',
    ],

    ctaTitle: 'Ready to start?',
    ctaBody: 'Create an account and try Tasky — simple, fast, fair.',
    ctaBtn: 'Get Started',
    ctaBtnSecondary: 'Browse Tasks',
  },
} as const;

const iconMap: Record<string, React.ElementType> = {
  UserPlus,
  PlusCircle,
  Users,
  CheckCircle,
  FileText,
  ThumbsUp,
  AlertTriangle,
  Scale,
  Star,
  Wallet,
  Clock,
  ShieldCheck,
  Zap,
  MessageSquare,
  RefreshCw,
  Lock,
};

function StepCard({
  step,
  icon,
  title,
  body,
  note,
  subItems,
  color,
}: {
  step: number;
  icon: string;
  title: string;
  body: string | null;
  note?: string;
  subItems?: { label: string; text: string }[];
  color: string;
}) {
  const Icon = iconMap[icon] ?? FileText;

  const ringColors: Record<string, string> = {
    cyan: 'ring-cyan-400/60 text-cyan-400',
    violet: 'ring-violet-400/60 text-violet-400',
    emerald: 'ring-emerald-400/60 text-emerald-400',
    amber: 'ring-amber-400/60 text-amber-400',
    rose: 'ring-rose-400/60 text-rose-400',
    sky: 'ring-sky-400/60 text-sky-400',
    fuchsia: 'ring-fuchsia-400/60 text-fuchsia-400',
  };

  const iconBg: Record<string, string> = {
    cyan: 'bg-cyan-500/15 text-cyan-400',
    violet: 'bg-violet-500/15 text-violet-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
    amber: 'bg-amber-500/15 text-amber-400',
    rose: 'bg-rose-500/15 text-rose-400',
    sky: 'bg-sky-500/15 text-sky-400',
    fuchsia: 'bg-fuchsia-500/15 text-fuchsia-400',
  };

  return (
    <div className="relative card p-5 flex gap-4 group hover:border-white/20 transition-colors duration-200">
      {/* Step number */}
      <div className="shrink-0 flex flex-col items-center gap-2 pt-0.5">
        <div
          className={`w-9 h-9 rounded-full ring-2 flex items-center justify-center text-sm font-bold ${ringColors[color] ?? ringColors.cyan}`}
        >
          {step}
        </div>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg[color] ?? iconBg.cyan}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2.5">
        <h3 className="font-semibold text-base leading-tight">{title}</h3>
        {body && <p className="text-sm text-white/75 leading-relaxed">{body}</p>}
        {subItems && (
          <div className="space-y-2">
            {subItems.map((s, i) => (
              <div key={i} className="rounded-lg bg-white/4 border border-white/8 p-3 space-y-1">
                <div className="text-xs font-semibold text-white/90">{s.label}</div>
                <div className="text-xs text-white/70 leading-relaxed">{s.text}</div>
              </div>
            ))}
          </div>
        )}
        {note && (
          <div className="flex gap-2 rounded-lg bg-amber-500/8 border border-amber-400/25 p-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90 leading-relaxed">{note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
      <span className="block w-1 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-violet-500" />
      {children}
    </h2>
  );
}

const clientColors = ['cyan', 'violet', 'emerald', 'sky', 'amber', 'fuchsia', 'emerald'];
const workerColors = ['cyan', 'violet', 'sky', 'amber', 'rose', 'emerald', 'fuchsia'];

export default function HowItWorksPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale === 'en' ? 'en' : 'ka';
  const t = content[locale];

  return (
    <div className="max-w-3xl mx-auto space-y-14 pb-16">
      {/* Back link */}
      <div>
        <Link
          href={`/${locale}`}
          className="text-sm text-white/50 hover:text-cyan-400 transition-colors"
        >
          {t.backHome}
        </Link>
      </div>

      {/* Hero */}
      <div className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-extrabold leading-tight bg-gradient-to-r from-cyan-400 via-white to-violet-400 bg-clip-text text-transparent">
          {t.title}
        </h1>
        <p className="text-white/65 text-base md:text-lg leading-relaxed max-w-2xl">
          {t.subtitle}
        </p>
      </div>

      {/* Platform overview */}
      <section className="card p-5 md:p-6 space-y-2 border-cyan-500/30">
        <SectionTitle>{t.overviewTitle}</SectionTitle>
        <p className="text-white/75 text-sm leading-relaxed">{t.overviewText}</p>

        {/* Flow diagram */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
          {[
            locale === 'ka' ? 'CLIENT — ქმნის ტასკს' : 'CLIENT — posts task',
            locale === 'ka' ? 'WORKER — ავლებს / იღებს' : 'WORKER — applies / claims',
            locale === 'ka' ? 'Chat (exclusive)' : 'Chat (exclusive)',
            locale === 'ka' ? 'WORKER — Evidence' : 'WORKER — Evidence',
            locale === 'ka' ? 'CLIENT — Approve / Fixes / Dispute' : 'CLIENT — Approve / Fixes / Dispute',
            locale === 'ka' ? 'ADMIN — გადაწყვეტილება' : 'ADMIN — Decision',
            locale === 'ka' ? '✅ გადახდა' : '✅ Payment',
          ].map((label, i, arr) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-full bg-white/6 border border-white/12 text-white/80 font-medium">
                {label}
              </span>
              {i < arr.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-white/30" />
              )}
            </span>
          ))}
        </div>
      </section>

      {/* CLIENT STEPS */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <SectionTitle>{t.clientTitle}</SectionTitle>
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-semibold">
            CLIENT
          </span>
        </div>
        <div className="space-y-3">
          {t.clientSteps.map((s, i) => (
            <StepCard
              key={i}
              step={i + 1}
              icon={s.icon}
              title={s.title}
              body={s.body}
              note={(s as any).note}
              subItems={(s as any).subItems}
              color={clientColors[i] ?? 'cyan'}
            />
          ))}
        </div>
      </section>

      {/* WORKER STEPS */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <SectionTitle>{t.workerTitle}</SectionTitle>
          <span className="px-2.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-400/30 text-violet-300 text-xs font-semibold">
            WORKER
          </span>
        </div>
        <div className="space-y-3">
          {t.workerSteps.map((s, i) => (
            <StepCard
              key={i}
              step={i + 1}
              icon={s.icon}
              title={s.title}
              body={s.body}
              note={(s as any).note}
              subItems={(s as any).subItems}
              color={workerColors[i] ?? 'violet'}
            />
          ))}
        </div>
      </section>

      {/* DEADLINES */}
      <section className="space-y-4">
        <SectionTitle>{t.deadlineTitle}</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          {t.deadlineItems.map((d, i) => (
            <div key={i} className="card p-4 space-y-2 border-amber-500/20 hover:border-amber-400/40 transition-colors">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold text-sm">{d.title}</span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DISPUTE */}
      <section className="space-y-4">
        <SectionTitle>{t.disputeTitle}</SectionTitle>
        <div className="card p-5 space-y-3">
          {t.disputeSteps.map((s, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="w-7 h-7 rounded-full ring-2 ring-fuchsia-400/50 text-fuchsia-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {s.step}
              </div>
              <p className="text-sm text-white/75 leading-relaxed pt-0.5">{s.text}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 rounded-xl bg-rose-500/8 border border-rose-400/25 p-4">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-200/90 leading-relaxed">{t.disputeNote}</p>
        </div>
      </section>

      {/* FINANCES */}
      <section className="space-y-4">
        <SectionTitle>{t.financeTitle}</SectionTitle>
        <div className="grid sm:grid-cols-3 gap-3">
          {t.financeItems.map((f, i) => {
            const Icon = iconMap[f.icon] ?? Wallet;
            const colors = ['text-emerald-400 bg-emerald-500/12 border-emerald-500/25', 'text-sky-400 bg-sky-500/12 border-sky-500/25', 'text-violet-400 bg-violet-500/12 border-violet-500/25'];
            return (
              <div key={i} className={`card p-4 space-y-2 border ${colors[i] ?? colors[0]} hover:border-opacity-60 transition-colors`}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="font-semibold text-sm">{f.title}</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* TIPS */}
      <section className="space-y-4">
        <SectionTitle>{t.tipsTitle}</SectionTitle>
        <div className="card p-5 space-y-2.5">
          {t.tips.map((tip, i) => (
            <div key={i} className="flex gap-3 items-start">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-white/75 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="card p-8 text-center space-y-4 border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-violet-500/5">
        <h2 className="text-2xl font-bold">{t.ctaTitle}</h2>
        <p className="text-white/65 text-sm">{t.ctaBody}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/${locale}/auth/register`}
            className="btn-hero-primary"
            data-text={t.ctaBtn}
          >
            <span className="btn-text">{t.ctaBtn}</span>
          </Link>
          <Link
            href={`/${locale}/tasky`}
            className="btn-hero-secondary"
            data-text={t.ctaBtnSecondary}
          >
            <span className="btn-text">{t.ctaBtnSecondary}</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
