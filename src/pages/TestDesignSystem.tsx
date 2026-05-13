export default function TestDesignSystem() {
  return (
    <div className="min-h-screen bg-background p-8 text-on-surface">
      <h1 className="mb-8 text-4xl font-display">设计系统测试页面</h1>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-display">颜色令牌</h2>
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-primary p-4 text-white">Primary</div>
          <div className="rounded-lg bg-primary-container p-4 text-primary">Primary Container</div>
          <div className="rounded-lg bg-secondary p-4 text-white">Secondary</div>
          <div className="rounded-lg bg-secondary-container p-4 text-secondary">Secondary Container</div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-display">组件状态</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-surface p-6 shadow-sm">
            <h3 className="mb-2 text-lg font-semibold">基础卡片</h3>
            <p className="text-on-surface-variant">Surface 背景</p>
          </div>
          <div className="rounded-xl bg-primary-container p-6">
            <h3 className="mb-2 text-lg font-semibold text-primary">主要容器</h3>
            <p className="text-primary/80">Primary Container 背景</p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-high p-6">
            <h3 className="mb-2 text-lg font-semibold">高层级容器</h3>
            <p className="text-on-surface-variant">Surface Container High 背景</p>
          </div>
        </div>
      </section>
    </div>
  );
}
