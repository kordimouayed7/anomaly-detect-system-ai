// Ce fichier contient toutes les classes Tailwind extraites pour alléger le JSX
export const styles = {
  // Styles pour la page de Login
  login: {
    container: "min-h-screen w-full flex items-center justify-center bg-[#F9F7F5] font-sans",
    card: "w-full max-w-[420px] bg-white rounded-[32px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] p-10 mx-4",
    iconHeader: "flex justify-center mb-6",
    iconCircle: "w-16 h-16 bg-[#EFE8DE] rounded-full flex items-center justify-center text-[#8C7E72] shadow-inner",
    headings: "text-center mb-10",
    title: "text-2xl font-bold text-[#4A4238] mb-2 tracking-tight",
    subtitle: "text-[#9CA3AF] text-sm font-medium",
    form: "space-y-6",
    inputGroup: "group relative",
    input: "w-full px-5 py-4 bg-transparent border border-[#E5E7EB] rounded-2xl text-[#4B5563] placeholder-[#9CA3AF] text-sm focus:outline-none focus:border-[#D4B491] focus:ring-4 focus:ring-[#D4B491]/10 transition-all duration-300",
    inputWithIcon: "pr-12", // Appliqué au champ mot de passe
    eyeButton: "absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B5E54] transition-colors",
    optionsRow: "flex items-center justify-between text-sm px-1",
    checkboxLabel: "flex items-center gap-2 text-[#8C7E72] cursor-pointer hover:text-[#5d534b] transition-colors select-none",
    checkbox: "w-4 h-4 rounded border-[#D1D5DB] text-[#D4B491] focus:ring-[#D4B491] focus:ring-offset-0 bg-white",
    forgotLink: "font-medium text-[#8C7E72] hover:text-[#5d534b] transition-colors",
    signInBtn: "w-full py-4 bg-[#E3CBA8] hover:bg-[#D6BD96] text-white font-bold rounded-2xl shadow-lg shadow-[#E3CBA8]/20 transform transition-all duration-200 active:scale-[0.98] mt-2"
  },
  
  // Styles globaux du Dashboard
  layout: {
    wrapper: "flex min-h-screen bg-slate-50 font-sans",
    main: "flex-1 flex flex-col min-w-0",
    content: "p-4 md:p-8 max-w-6xl mx-auto w-full"
  },

  // Styles de la Sidebar
  sidebar: {
    container: "w-64 bg-slate-50 border-r border-slate-200 flex flex-col hidden md:flex",
    header: "h-16 flex items-center px-6 border-b border-slate-200 bg-white",
    brand: "flex items-center gap-2 font-bold text-slate-800 tracking-tight",
    brandIcon: "bg-indigo-600 w-6 h-6 rounded flex items-center justify-center text-white",
    nav: "flex-1 py-6 px-3 space-y-1",
    sectionLabel: "px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider",
    item: (active) => `w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${active ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`,
    footer: "p-4 border-t border-slate-200",
    profile: "flex items-center gap-3",
    avatar: "w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs",
    userInfo: "flex-1 min-w-0",
    userName: "text-sm font-medium text-slate-900 truncate",
    userRole: "text-xs text-slate-500 truncate"
  },

  // Styles de la Navbar
  navbar: {
    container: "h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8",
    breadcrumbs: "flex items-center gap-2 text-sm text-slate-500",
    breadcrumbItem: "font-medium text-slate-900 hidden sm:inline",
    divider: "text-slate-300 hidden sm:inline",
    badge: "font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs border border-indigo-100",
    actions: "flex items-center gap-4",
    statusDot: "h-2 w-2 rounded-full bg-emerald-500 animate-pulse",
    statusText: "text-xs font-mono text-slate-500 hidden sm:inline",
    verticalDivider: "h-4 w-px bg-slate-200 mx-2 hidden sm:inline",
    logoutBtn: "text-sm text-slate-600 hover:text-slate-900 font-medium"
  },

  // Styles spécifiques aux composants Dashboard
  dashboard: {
    header: "mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4",
    title: "text-2xl font-bold text-slate-900",
    subtitle: "text-sm text-slate-500 mt-1",
    controls: "flex gap-2",
    select: "text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500",
    exportBtn: "text-sm bg-white border border-slate-300 px-3 py-2 rounded-md font-medium text-slate-700 hover:bg-slate-50",
    grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8",
    
    // Graphiques
    chartCard: "bg-white rounded border border-slate-200 p-6 mb-8 shadow-sm",
    chartHeader: "flex items-center justify-between mb-4",
    chartTitle: "text-sm font-semibold text-slate-900",
    chartMetric: "text-xs text-slate-400 font-mono",
    chartBody: "h-64 flex items-end gap-1 pb-4 border-b border-slate-100",
    bar: (height) => `flex-1 bg-indigo-50 hover:bg-indigo-100 transition-colors rounded-t-sm relative group`,
    tooltip: "opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10",
    
    // Tableau
    tableCard: "bg-white rounded border border-slate-200 overflow-hidden shadow-sm",
    tableHeader: "px-6 py-4 border-b border-slate-200 flex justify-between items-center",
    tableTitle: "text-sm font-semibold text-slate-900",
    viewAll: "text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1",
    tableWrapper: "overflow-x-auto",
    table: "min-w-full divide-y divide-slate-200",
    thead: "bg-slate-50",
    th: (align) => `px-6 py-3 ${align} text-xs font-medium text-slate-500 uppercase tracking-wider`,
    tbody: "bg-white divide-y divide-slate-200",
    tr: "hover:bg-slate-50",
    td: (font) => `px-6 py-4 whitespace-nowrap text-sm ${font || 'text-slate-700'}`,
    severityBadge: (level) => `px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${level === 'Critical' ? 'bg-red-100 text-red-800' : level === 'Warning' ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'}`
  },

  // Composant KPI Card
  kpi: {
    card: "bg-white rounded border border-slate-200 p-5 shadow-sm",
    title: "text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4",
    row: "flex items-baseline justify-between",
    value: "text-2xl font-bold text-slate-900 font-mono tracking-tight",
    badge: (trend) => `text-xs font-medium px-1.5 py-0.5 rounded ${trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`
  }
};