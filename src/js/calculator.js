(() => {
  let registered = false;
  const register = () => {
    if (registered) return;
    registered = true;
    Alpine.data('calculator', () => ({
    unit: 'ft',
    depthInput: null,
    widthInput: null,
    heightInput: null,
    players: 'rightyOnly',
    budgetPreset: '5000',
    budgetCustom: null,
    strictFit: true,
    activeDimension: null,
    showSwingZone: false,
    swapOpen: false,
    swapCategory: null,
    selectedOverrides: {},
    loading: true,
    sampleProfiles: [
      { id: 'garage', name: 'Single Car Garage', depth: 18, width: 10, height: 9 },
      { id: 'bedroom', name: 'Spare Bedroom', depth: 12, width: 10, height: 9 },
      { id: 'basement', name: 'Basement', depth: 16, width: 12, height: 8.5 },
    ],
    monitors: [],
    enclosures: [],
    mats: [],
    projectors: [],
    pcs: [],
    async init() {
      this.applyDefaults();
      await this.loadData();
    },
    applyDefaults() {
      const hasAny = this.depthInput || this.widthInput || this.heightInput;
      if (hasAny) return;
      const defaults = { depth: 14, width: 12, height: 9 };
      this.setDimensionInputs(defaults.depth, defaults.width, defaults.height);
    },
    setDimensionInputs(depthFt, widthFt, heightFt) {
      const toUnit = (value) => (this.unit === 'm' ? value / 3.28084 : value);
      this.depthInput = Number(toUnit(depthFt).toFixed(2));
      this.widthInput = Number(toUnit(widthFt).toFixed(2));
      this.heightInput = Number(toUnit(heightFt).toFixed(2));
    },
    setPreset(preset) {
      const presets = {
        garage: { depth: 20, width: 12, height: 9 },
        bedroom: { depth: 12, width: 10, height: 8.5 },
        basement: { depth: 16, width: 14, height: 9 },
      };
      const selection = presets[preset];
      if (!selection) return;
      this.setDimensionInputs(selection.depth, selection.width, selection.height);
    },
    loadProfile(profileId) {
      const profile = this.sampleProfiles.find((entry) => entry.id === profileId);
      if (!profile) return;
      this.setDimensionInputs(profile.depth, profile.width, profile.height);
    },
    openSwap(category) {
      this.swapCategory = category;
      this.swapOpen = true;
      this.$nextTick(() => this.focusSwapFirst());
    },
    closeSwap() {
      this.swapOpen = false;
      this.swapCategory = null;
    },
    selectAlternative(category, itemId) {
      if (!category || !itemId) return;
      this.selectedOverrides[category] = itemId;
      this.closeSwap();
    },
    focusSwapFirst() {
      if (!this.$refs.swapPanel) return;
      const focusables = this.getFocusable(this.$refs.swapPanel);
      if (focusables.length) focusables[0].focus();
    },
    trapSwapFocus(event) {
      if (!this.$refs.swapPanel) return;
      const focusables = this.getFocusable(this.$refs.swapPanel);
      if (!focusables.length) return;
      const currentIndex = focusables.indexOf(document.activeElement);
      const lastIndex = focusables.length - 1;
      if (event.shiftKey && (currentIndex <= 0 || currentIndex === -1)) {
        event.preventDefault();
        focusables[lastIndex].focus();
      } else if (!event.shiftKey && (currentIndex === lastIndex || currentIndex === -1)) {
        event.preventDefault();
        focusables[0].focus();
      }
    },
    getFocusable(container) {
      return Array.from(
        container.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex=\"-1\"])'
        )
      );
    },
    async loadData() {
      const files = [
        '/data/monitors.json',
        '/data/enclosures.json',
        '/data/mats.json',
        '/data/projectors.json',
        '/data/pcs.json',
      ];
      try {
        const [monitors, enclosures, mats, projectors, pcs] = await Promise.all(
          files.map((path) =>
            fetch(path)
              .then((res) => (res.ok ? res.json() : []))
              .catch(() => [])
          )
        );
        this.monitors = monitors;
        this.enclosures = enclosures;
        this.mats = mats;
        this.projectors = projectors;
        this.pcs = pcs;
      } finally {
        this.loading = false;
      }
    },
    get depthFt() {
      const value = Number(this.depthInput) || 0;
      return this.unit === 'm' ? value * 3.28084 : value;
    },
    get widthFt() {
      const value = Number(this.widthInput) || 0;
      return this.unit === 'm' ? value * 3.28084 : value;
    },
    get heightFt() {
      const value = Number(this.heightInput) || 0;
      return this.unit === 'm' ? value * 3.28084 : value;
    },
    get hasBasics() {
      return this.depthInput && this.widthInput && this.heightInput;
    },
    get budgetValue() {
      return this.budgetPreset === 'custom' ? this.budgetCustom : this.budgetPreset;
    },
    get budgetLimit() {
      if (this.budgetPreset === 'unlimited') return Infinity;
      if (this.budgetPreset === 'custom') {
        return Number(this.budgetCustom) || Infinity;
      }
      return Number(this.budgetPreset) || Infinity;
    },
    get depthStatus() {
      const depth = this.depthFt;
      if (!depth) return 'warn';
      if (depth < 12) return 'warn';
      return 'good';
    },
    get widthStatus() {
      const width = this.widthFt;
      if (!width) return 'warn';
      if (this.players === 'mixedRightyLefty' && width < 10) return 'warn';
      return 'good';
    },
    get heightStatus() {
      const height = this.heightFt;
      if (!height) return 'warn';
      if (height < 8.5) return 'bad';
      return 'good';
    },
    get warningMessages() {
      const warnings = [];
      const depth = this.depthFt;
      const width = this.widthFt;
      const height = this.heightFt;
      if (height && height < 8.5) {
        warnings.push('Too low for driver swings; irons only.');
      }
      if (depth && depth < 12) {
        warnings.push('Too short for radar monitors; use camera/photometric.');
      }
      if (width && width < 10 && this.players === 'mixedRightyLefty') {
        warnings.push('Not wide enough for centered hitting; lefty/righty together is difficult.');
      }
      return warnings;
    },
    get roomScore() {
      let score = 10;
      const penalties = [];
      const depth = this.depthFt;
      const width = this.widthFt;
      const height = this.heightFt;

      if (height && height < 8.5) {
        score -= 4;
        penalties.push({ amount: 4, reason: 'Low ceiling height' });
      } else if (height && height < 9.0) {
        score -= 2;
        penalties.push({ amount: 2, reason: 'Ceiling height' });
      }

      if (depth && depth < 12) {
        score -= 3;
        penalties.push({ amount: 3, reason: 'Room depth' });
      }

      if (width && width < 10 && this.players === 'mixedRightyLefty') {
        score -= 2;
        penalties.push({ amount: 2, reason: 'Room width for mixed players' });
      }

      score = Math.max(0, Math.min(10, score));
      let label = 'Challenging';
      if (score >= 9) label = 'Excellent';
      else if (score >= 7) label = 'Great';
      else if (score >= 5) label = 'Workable';

      const limiting = penalties.sort((a, b) => b.amount - a.amount)[0];
      return {
        score,
        label,
        limiting: limiting ? limiting.reason : 'Nothing major yet.',
      };
    },
    recommendations() {
      return [
        this.buildRecommendation('Launch Monitor', 'monitor', this.monitors, () =>
          this.pickMonitor(this.monitors)
        ),
        this.buildRecommendation('Enclosure / Screen', 'enclosure', this.enclosures, () =>
          this.pickEnclosure(this.enclosures)
        ),
        this.buildRecommendation('Hitting Mat', 'mat', this.mats, () =>
          this.pickSimple(this.mats, 'mat')
        ),
        this.buildRecommendation('Projector', 'projector', this.projectors, () =>
          this.pickProjector(this.projectors)
        ),
        this.buildRecommendation('Sim PC', 'pc', this.pcs, () => this.pickSimple(this.pcs, 'pc')),
      ];
    },
    buildRecommendation(title, key, items, picker) {
      const result = picker();
      return {
        title,
        key,
        item: result.item,
        fallback: result.fallback,
        category: title,
        fitNotes: result.fitNotes,
        fitScore: result.fitScore,
        fitLabel: result.fitLabel,
      };
    },
    pickMonitor(items) {
      const fits = (item) => this.monitorFits(item);
      return this.pickWithRules(items, fits, 'monitor');
    },
    pickEnclosure(items) {
      const fits = (item) => this.enclosureFits(item);
      return this.pickWithRules(items, fits, 'enclosure');
    },
    pickProjector(items) {
      const fits = (item) => this.projectorFits(item);
      return this.pickWithRules(items, fits, 'projector');
    },
    pickSimple(items, category) {
      const fits = () => true;
      return this.pickWithRules(items, fits, category);
    },
    pickWithRules(items, fits, category) {
      if (!items.length) {
        return { item: null, fallback: 'Data is still loading. Try again shortly.' };
      }
      const budgetLimit = this.budgetLimit;
      let candidates = items.filter((item) => item.price <= budgetLimit);
      const fitCandidates = this.getFitCandidates(items, fits);
      const overrideId = this.selectedOverrides[category];
      if (overrideId) {
        const overrideItem = fitCandidates.find((item) => item.id === overrideId);
        if (overrideItem) {
          const fitMeta = this.computeFitScore(overrideItem, category, fits);
          return {
            item: overrideItem,
            fallback: '',
            fitNotes: this.buildFitNotes(overrideItem, category),
            fitScore: fitMeta.score,
            fitLabel: fitMeta.label,
          };
        }
        delete this.selectedOverrides[category];
      }

      if (this.strictFit) {
        candidates = candidates.filter((item) => fits(item));
      } else {
        const fitting = candidates.filter((item) => fits(item));
        const notFitting = candidates.filter((item) => !fits(item));
        candidates = fitting.length ? fitting.concat(notFitting) : notFitting;
      }

      if (!candidates.length) {
        return { item: null, fallback: this.buildFallback(category, items) };
      }

      const scored = candidates
        .map((item) => ({ item, score: this.scoreItem(item, category) }))
        .sort((a, b) => b.score - a.score);

      const chosen = scored[0].item;
      const fitMeta = this.computeFitScore(chosen, category, fits);
      return {
        item: chosen,
        fallback: '',
        fitNotes: this.buildFitNotes(chosen, category),
        fitScore: fitMeta.score,
        fitLabel: fitMeta.label,
      };
    },
    getFitCandidates(items, fits) {
      const budgetLimit = this.budgetLimit;
      return items.filter((item) => item.price <= budgetLimit).filter((item) => fits(item));
    },
    getRankedCandidates(category, items, fits) {
      const candidates = this.getFitCandidates(items, fits);
      return candidates
        .map((item) => {
          const fitMeta = this.computeFitScore(item, category, fits);
          return { item, fitScore: fitMeta.score };
        })
        .sort((a, b) => {
          const tierDelta = this.tierScore(b.item.tier) - this.tierScore(a.item.tier);
          if (tierDelta !== 0) return tierDelta;
          if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
          return a.item.price - b.item.price;
        })
        .map((entry) => entry.item);
    },
    getAlternatives(category, count = 3) {
      if (!category) return [];
      const map = {
        monitor: { items: this.monitors, fits: (item) => this.monitorFits(item) },
        enclosure: { items: this.enclosures, fits: (item) => this.enclosureFits(item) },
        mat: { items: this.mats, fits: () => true },
        projector: { items: this.projectors, fits: (item) => this.projectorFits(item) },
        pc: { items: this.pcs, fits: () => true },
      };
      const entry = map[category];
      if (!entry) return [];
      const ranked = this.getRankedCandidates(category, entry.items, entry.fits);
      const current = this.selectedOverrides[category];
      const filtered = ranked.filter((item) => item.id !== current);
      return filtered.slice(0, count);
    },
    monitorFits(item) {
      const depth = this.depthFt;
      const width = this.widthFt;
      const height = this.heightFt;
      if (!depth || !width) return false;
      if (depth < item.min_depth_ft) return false;
      if (width < item.min_width_ft) return false;
      if (item.min_height_ft && height < item.min_height_ft) return false;
      return true;
    },
    enclosureFits(item) {
      const depth = this.depthFt;
      const height = this.heightFt;
      if (!height) return false;
      if (height < item.min_height_ft) return false;
      if (item.recommended_depth_ft && depth < item.recommended_depth_ft) return false;
      return true;
    },
    projectorFits(item) {
      const depth = this.depthFt;
      if (!depth) return false;
      if (item.min_throw_distance_ft && depth < item.min_throw_distance_ft) return false;
      return true;
    },
    scoreItem(item, category) {
      let score = this.tierScore(item.tier);
      if (item.badge) score += 0.2;
      score += item.price / 10000;

      if (category === 'monitor') {
        const depth = this.depthFt;
        if (depth && depth < 12) {
          if (item.type === 'photometric') score += 0.5;
          if (item.type === 'radar') score -= 0.5;
        }
      }
      return score;
    },
    tierScore(tier) {
      if (tier === 'pro') return 3;
      if (tier === 'mid') return 2;
      return 1;
    },
    buildFallback(category, items) {
      const depth = this.depthFt;
      const width = this.widthFt;
      const height = this.heightFt;
      const budgetLimit = this.budgetLimit;
      const minPrice = Math.min(...items.map((item) => item.price || Infinity));

      const hints = [];
      if (budgetLimit !== Infinity && minPrice !== Infinity && budgetLimit < minPrice) {
        hints.push(`Increase budget to at least ${this.formatPrice(minPrice)}.`);
      }

      if (category === 'monitor') {
        if (depth && depth < 12) hints.push('Increase depth to 12 ft+ for better launch monitor options.');
        if (width && width < 10) hints.push('Increase width to 10 ft+ for comfortable setup.');
        if (height && height < 8.5) hints.push('Increase ceiling height to at least 8.5 ft.');
      }

      if (category === 'enclosure') {
        const minHeight = this.minValue(items, 'min_height_ft');
        const minDepth = this.minValue(items, 'recommended_depth_ft');
        if (minHeight && height && height < minHeight) {
          hints.push(`Increase ceiling height to ${minHeight} ft+.`);
        }
        if (minDepth && depth && depth < minDepth) {
          hints.push(`Increase depth to ${minDepth} ft+ for enclosure clearance.`);
        }
      }

      if (category === 'projector') {
        const minThrow = this.minValue(items, 'min_throw_distance_ft');
        if (minThrow && depth && depth < minThrow) {
          hints.push(`Increase depth to ${minThrow} ft+ for projector throw distance.`);
        }
      }

      if (category === 'mat' || category === 'pc') {
        if (!hints.length) hints.push('Increase budget to unlock more options.');
      }

      if (!hints.length) {
        hints.push('Loosen strict fit or adjust dimensions for more options.');
      }

      return hints.join(' ');
    },
    buildFitNotes(item, category) {
      const notes = [];
      const depth = this.depthFt;
      const width = this.widthFt;
      const height = this.heightFt;
      if (category === 'monitor') {
        if (item.type === 'photometric') notes.push('Photometric friendly for shorter depth.');
        if (item.type === 'radar') notes.push('Radar accuracy improves with extra depth.');
      }
      if (category === 'enclosure') {
        if (item.recommended_depth_ft && depth) {
          notes.push(`Requires ~${item.recommended_depth_ft} ft depth for safe clearance.`);
        }
      }
      if (category === 'projector') {
        if (item.min_throw_distance_ft && depth) {
          notes.push(`Fits your depth if you can mount at ${item.min_throw_distance_ft} ft+.`);
        }
      }
      if (width) notes.push(`Width check: ${width} ft.`);
      if (height) notes.push(`Ceiling check: ${height} ft.`);
      return notes.slice(0, 2).join(' ');
    },
    computeFitScore(item, category, fits) {
      if (fits && !fits(item)) {
        return { score: 0, label: 'Incompatible' };
      }
      const scores = [];
      const addScore = (value, min) => {
        if (!min) return;
        if (!value) {
          scores.push(0);
          return;
        }
        scores.push(this.clamp((value / min) * 100, 0, 100));
      };

      const depth = this.depthFt;
      const width = this.widthFt;
      const height = this.heightFt;

      if (category === 'monitor') {
        addScore(depth, item.min_depth_ft);
        addScore(width, item.min_width_ft);
        addScore(height, item.min_height_ft);
      } else if (category === 'enclosure') {
        addScore(height, item.min_height_ft);
        addScore(depth, item.recommended_depth_ft);
      } else if (category === 'projector') {
        addScore(depth, item.min_throw_distance_ft);
      }

      if (!scores.length) {
        return { score: 100, label: 'Good Fit' };
      }

      const score = Math.round(Math.min(...scores));
      let label = 'Incompatible';
      if (score >= 90) label = 'Perfect Fit';
      else if (score >= 75) label = 'Good Fit';
      else if (score >= 60) label = 'Tight Fit';
      return { score, label };
    },
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },
    minValue(items, field) {
      const values = items
        .map((item) => item[field])
        .filter((value) => typeof value === 'number' && !Number.isNaN(value));
      return values.length ? Math.min(...values) : null;
    },
    formatPrice(value) {
      const number = Number(value) || 0;
      return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    },
    get currentTotalCost() {
      const recs = this.recommendations();
      return recs.reduce((sum, rec) => (rec.item ? sum + (rec.item.price || 0) : sum), 0);
    },
    get budgetHealth() {
      if (this.budgetLimit === Infinity) return 'safe';
      return this.currentTotalCost > this.budgetLimit ? 'over' : 'safe';
    },
    }));
    if (document.body && Alpine.initTree) {
      Alpine.initTree(document.body);
    }
  };

  if (window.Alpine && window.Alpine.data) {
    register();
  } else {
    document.addEventListener('alpine:init', register);
  }
})();
