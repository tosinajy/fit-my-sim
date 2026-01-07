(() => {
  let registered = false;
  const register = () => {
    if (registered) return;
    registered = true;
    Alpine.data('calculator', () => ({
    depth: null,
    width: null,
    height: null,
    players: 'rightyOnly',
    budgetPreset: '5000',
    budgetCustom: null,
    strictFit: true,
    loading: true,
    monitors: [],
    enclosures: [],
    mats: [],
    projectors: [],
    pcs: [],
    async init() {
      await this.loadData();
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
    get hasBasics() {
      return this.depth && this.width && this.height;
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
    get warningMessages() {
      const warnings = [];
      const depth = Number(this.depth) || 0;
      const width = Number(this.width) || 0;
      const height = Number(this.height) || 0;
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
      const depth = Number(this.depth) || 0;
      const width = Number(this.width) || 0;
      const height = Number(this.height) || 0;

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
      };
    },
    pickMonitor(items) {
      const depth = Number(this.depth) || 0;
      const width = Number(this.width) || 0;
      const height = Number(this.height) || 0;
      const fits = (item) => {
        if (!depth || !width) return false;
        if (depth < item.min_depth_ft) return false;
        if (width < item.min_width_ft) return false;
        if (item.min_height_ft && height < item.min_height_ft) return false;
        return true;
      };
      return this.pickWithRules(items, fits, 'monitor');
    },
    pickEnclosure(items) {
      const depth = Number(this.depth) || 0;
      const height = Number(this.height) || 0;
      const fits = (item) => {
        if (!height) return false;
        if (height < item.min_height_ft) return false;
        if (item.recommended_depth_ft && depth < item.recommended_depth_ft) return false;
        return true;
      };
      return this.pickWithRules(items, fits, 'enclosure');
    },
    pickProjector(items) {
      const depth = Number(this.depth) || 0;
      const fits = (item) => {
        if (!depth) return false;
        if (item.min_throw_distance_ft && depth < item.min_throw_distance_ft) return false;
        return true;
      };
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

      return {
        item: scored[0].item,
        fallback: '',
        fitNotes: this.buildFitNotes(scored[0].item, category),
      };
    },
    scoreItem(item, category) {
      let score = this.tierScore(item.tier);
      if (item.badge) score += 0.2;
      score += item.price / 10000;

      if (category === 'monitor') {
        const depth = Number(this.depth) || 0;
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
      const depth = Number(this.depth) || 0;
      const width = Number(this.width) || 0;
      const height = Number(this.height) || 0;
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
      const depth = Number(this.depth) || 0;
      const width = Number(this.width) || 0;
      const height = Number(this.height) || 0;
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
