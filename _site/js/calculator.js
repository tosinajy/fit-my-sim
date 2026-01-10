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
      urlSyncTimer: null,
      products: {
        monitors: [],
        enclosures: [],
        mats: [],
        projectors: [],
        pcs: [],
      },
      sampleProfiles: [
        { id: 'garage', name: 'Single Car Garage', depth: 18, width: 10, height: 9 },
        { id: 'bedroom', name: 'Spare Bedroom', depth: 12, width: 10, height: 9 },
        { id: 'basement', name: 'Basement', depth: 16, width: 12, height: 8.5 },
      ],
      init() {
        this.applyDatasetDefaults();
        this.applyUrlState();
        this.applyDefaults();
        this.loadProducts();
        this.setupUrlSync();
      },
      loadProducts() {
        const raw = this.$el?.dataset?.products;
        if (!raw) return;
        try {
          const data = JSON.parse(raw);
          this.products = {
            monitors: Array.isArray(data.monitors) ? data.monitors : [],
            enclosures: Array.isArray(data.enclosures) ? data.enclosures : [],
            mats: Array.isArray(data.mats) ? data.mats : [],
            projectors: Array.isArray(data.projectors) ? data.projectors : [],
            pcs: Array.isArray(data.pcs) ? data.pcs : [],
          };
        } catch (error) {
          this.products = {
            monitors: [],
            enclosures: [],
            mats: [],
            projectors: [],
            pcs: [],
          };
        }
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
      applyUrlState() {
        const params = new URLSearchParams(window.location.search);
        if (!params.toString()) return;
        const unit = params.get('unit');
        if (unit === 'ft' || unit === 'm') this.unit = unit;
        const depth = this.parseNumber(params.get('depth'));
        const width = this.parseNumber(params.get('width'));
        const height = this.parseNumber(params.get('height'));
        if (depth !== null) this.depthInput = depth;
        if (width !== null) this.widthInput = width;
        if (height !== null) this.heightInput = height;
        const players = params.get('players');
        if (players === 'rightyOnly' || players === 'mixedRightyLefty') this.players = players;
        const budgetPreset = params.get('budgetPreset');
        if (budgetPreset) this.budgetPreset = budgetPreset;
        const budgetCustom = this.parseNumber(params.get('budgetCustom'));
        if (budgetCustom !== null) this.budgetCustom = budgetCustom;
        const strictMode = params.get('strictMode');
        if (strictMode !== null) this.strictFit = strictMode === 'true';
      },
      applyDatasetDefaults() {
        if (!this.$el || !this.$el.dataset || !this.$el.dataset.defaults) return;
        try {
          const defaults = JSON.parse(this.$el.dataset.defaults);
          if (defaults && typeof defaults === 'object') {
            if (defaults.depth) this.depthInput = Number(defaults.depth);
            if (defaults.width) this.widthInput = Number(defaults.width);
            if (defaults.height) this.heightInput = Number(defaults.height);
          }
        } catch (error) {
          return;
        }
      },
      setupUrlSync() {
        this.$watch(
          () => ({
            unit: this.unit,
            depth: this.depthInput,
            width: this.widthInput,
            height: this.heightInput,
            players: this.players,
            budgetPreset: this.budgetPreset,
            budgetCustom: this.budgetCustom,
            strictMode: this.strictFit,
          }),
          () => {
            this.debouncedUrlSync();
          }
        );
      },
      debouncedUrlSync() {
        if (this.urlSyncTimer) clearTimeout(this.urlSyncTimer);
        this.urlSyncTimer = setTimeout(() => this.updateUrlState(), 200);
      },
      updateUrlState() {
        const params = new URLSearchParams();
        this.setParam(params, 'unit', this.unit);
        this.setParam(params, 'depth', this.depthInput);
        this.setParam(params, 'width', this.widthInput);
        this.setParam(params, 'height', this.heightInput);
        this.setParam(params, 'players', this.players);
        this.setParam(params, 'budgetPreset', this.budgetPreset);
        this.setParam(params, 'budgetCustom', this.budgetCustom);
        this.setParam(params, 'strictMode', this.strictFit);
        const query = params.toString();
        const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
        history.replaceState(null, '', url);
      },
      setParam(params, key, value) {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
      },
      parseNumber(value) {
        if (value === null || value === undefined || value === '') return null;
        const parsed = Number(value);
        if (Number.isNaN(parsed)) return null;
        return parsed;
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
      get budgetLimit() {
        if (this.budgetPreset === 'unlimited') return Infinity;
        if (this.budgetPreset === 'custom') {
          return Number(this.budgetCustom) || 0;
        }
        return Number(this.budgetPreset) || 0;
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
      get improvementTips() {
        if (!this.hasBasics) return [];
        const tips = [];
        const depth = this.depthFt;
        const width = this.widthFt;
        const height = this.heightFt;

        if (height && height < 8.5) {
          tips.push('Raise ceiling height to 8.5 ft+ for full swings, or plan for irons-only use.');
        } else if (height && height < 9) {
          tips.push('A bit more ceiling height improves driver clearance and comfort.');
        }

        if (depth && depth < 12) {
          tips.push('Aim for 12 ft+ depth; if not possible, plan for photometric monitors and ensure screen clearance.');
        }

        if (width && width < 10 && this.players === 'mixedRightyLefty') {
          tips.push('Mixed-handed play needs 10 ft+ width, or use an offset stance or dedicated side.');
        }

        if (this.strictFit) {
          tips.push('Strict mode: leave 1-2 ft of extra clearance beyond minimums for comfort.');
        }

        if (!tips.length) {
          tips.push('Your room fits well. Focus on placement, lighting control, and safety buffers.');
        }

        return tips;
      },
      get recommendations() {
        if (!this.hasBasics) return [];
        const categories = [
          { key: 'monitor', title: 'Launch Monitor', items: this.products.monitors },
          { key: 'enclosure', title: 'Enclosure / Screen', items: this.products.enclosures },
          { key: 'mat', title: 'Hitting Mat', items: this.products.mats },
          { key: 'projector', title: 'Projector', items: this.products.projectors },
          { key: 'pc', title: 'Sim PC', items: this.products.pcs },
        ];

        return categories
          .map((category) => this.buildCategoryRecommendations(category))
          .filter((category) => category.hasAny);
      },
      buildCategoryRecommendations({ key, title, items }) {
        const entries = Array.isArray(items) ? items : [];
        const ranked = entries
          .map((item) => this.buildRecommendation(item, key))
          .filter(Boolean)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((entry, index) => ({
            ...entry,
            badgeLabel: index === 0 ? 'Best Fit' : index === 1 ? 'Best Value' : 'Tight Fit',
          }));

        const padded = this.padRecommendations(ranked, key);
        return {
          key,
          title,
          items: padded,
          hasAny: ranked.length > 0,
        };
      },
      buildRecommendation(item, category) {
        const fit = this.evaluateFit(item, category);
        if (this.strictFit && !fit.ok) return null;
        if (!this.strictFit && !fit.ok && !fit.nearMatch) return null;

        const score = this.scoreItem(item, category, fit);
        return {
          item,
          score,
          fitLabel: fit.ok ? 'Compatible' : 'Requires changes',
          fitNotes: this.buildFitNotes(item, category, fit),
          requiresChanges: !fit.ok,
        };
      },
      evaluateFit(item, category) {
        const reasons = [];
        const deltas = {};
        const depth = this.depthFt;
        const width = this.widthFt;
        const height = this.heightFt;

        const addDelta = (label, actual, min) => {
          if (!min) return;
          const delta = actual - min;
          deltas[label] = delta;
          if (delta < 0) {
            reasons.push(`Needs ${Math.abs(delta).toFixed(1)} ft more ${label}.`);
          }
        };

        if (category === 'monitor') {
          addDelta('depth', depth, item.min_depth_ft);
          addDelta('width', width, item.min_width_ft);
          if (item.min_height_ft) addDelta('height', height, item.min_height_ft);
        }

        if (category === 'enclosure') {
          addDelta('height', height, item.min_height_ft);
          if (item.recommended_depth_ft) addDelta('depth', depth, item.recommended_depth_ft);
        }

        if (category === 'mat') {
          if (item.min_width_ft) addDelta('width', width, item.min_width_ft);
        }

        if (category === 'projector') {
          if (item.min_throw_distance_ft) addDelta('depth', depth, item.min_throw_distance_ft);
        }

        const negatives = Object.values(deltas).filter((value) => value < 0).map((value) => Math.abs(value));
        const ok = negatives.length === 0;
        const maxShortfall = negatives.length ? Math.max(...negatives) : 0;
        const nearMatch = !ok && maxShortfall <= 2;

        return {
          ok,
          reasons,
          deltas,
          nearMatch,
          maxShortfall,
        };
      },
      buildFitNotes(item, category, fit) {
        const notes = [];
        const depth = this.depthFt;
        const width = this.widthFt;
        const height = this.heightFt;

        if (!fit.ok) {
          notes.push(...fit.reasons);
        } else if (category === 'monitor') {
          if (depth && depth < 12 && item.type === 'photometric') {
            notes.push('Photometric friendly for shorter depth.');
          } else if (item.type === 'radar') {
            notes.push('Radar tracking improves with extra depth.');
          }
          notes.push('Meets depth and width requirements.');
        } else if (category === 'enclosure') {
          notes.push('Screen height clears recommended minimums.');
          if (item.recommended_depth_ft && depth) {
            notes.push(`Depth aligns with ${item.recommended_depth_ft} ft clearance guidance.`);
          }
        } else if (category === 'mat') {
          if (item.min_width_ft && width) {
            notes.push('Width clearance verified for stance comfort.');
          } else {
            notes.push('Flexible fit for most widths.');
          }
        } else if (category === 'projector') {
          if (item.throw_type === 'short') {
            notes.push('Short-throw friendly in compact rooms.');
          } else {
            notes.push('Balanced throw distance for full-screen coverage.');
          }
        } else if (category === 'pc') {
          notes.push('Meets sim performance expectations for smooth play.');
        }

        if (!notes.length) {
          notes.push('Meets your room constraints.');
        }

        return notes.slice(0, 2).join(' ');
      },
      scoreItem(item, category, fit) {
        let score = 0;
        const depth = this.depthFt;
        const width = this.widthFt;
        const height = this.heightFt;

        const addMargin = (actual, min) => {
          if (!min) return;
          const delta = actual - min;
          if (delta > 0) score += delta / min;
        };

        if (category === 'monitor') {
          addMargin(depth, item.min_depth_ft);
          addMargin(width, item.min_width_ft);
          if (item.min_height_ft) addMargin(height, item.min_height_ft);
        }

        if (category === 'enclosure') {
          addMargin(height, item.min_height_ft);
          if (item.recommended_depth_ft) addMargin(depth, item.recommended_depth_ft);
        }

        if (category === 'mat') {
          if (item.min_width_ft) addMargin(width, item.min_width_ft);
        }

        if (category === 'projector') {
          if (item.min_throw_distance_ft) addMargin(depth, item.min_throw_distance_ft);
        }

        score += this.tierWeight(item.tier);

        if (category === 'monitor' && depth && depth < 12) {
          if (item.type === 'photometric') score += 1;
          if (item.type === 'radar') score -= 0.5;
        }

        if (!fit.ok) {
          score -= 2 + fit.maxShortfall;
        }

        return score;
      },
      tierWeight(tier) {
        const budgetLimit = this.budgetLimit;
        if (!Number.isFinite(budgetLimit)) {
          return tier === 'pro' ? 3 : tier === 'mid' ? 2 : 1;
        }
        if (budgetLimit <= 2500) {
          return tier === 'budget' ? 3 : tier === 'mid' ? 2 : 1;
        }
        if (budgetLimit <= 9000) {
          return tier === 'mid' ? 3 : tier === 'budget' ? 2 : 1;
        }
        return tier === 'pro' ? 3 : tier === 'mid' ? 2 : 1;
      },
      padRecommendations(items, category) {
        const padded = [...items];
        const placeholdersNeeded = Math.max(0, 3 - padded.length);
        for (let i = 0; i < placeholdersNeeded; i += 1) {
          padded.push({
            placeholder: true,
            ...this.buildPlaceholder(category),
          });
        }
        return padded;
      },
      buildPlaceholder(category) {
        let tip = '';
        if (this.depthFt && this.depthFt < 12) {
          tip = 'Increasing depth by 2 ft may unlock more options.';
        } else if (this.heightFt && this.heightFt < 8.5) {
          tip = 'Raising ceiling height may unlock more options.';
        } else if (this.players === 'mixedRightyLefty' && this.widthFt && this.widthFt < 10) {
          tip = 'Extra width can unlock more options.';
        } else if (category === 'projector') {
          tip = 'Short-throw optics often widen the field of view.';
        }

        return {
          title: 'No additional compatible options',
          copy: 'This category has limited products that safely fit your room.',
          tip,
        };
      },
    }));
  };

  if (window.Alpine && window.Alpine.data) {
    register();
  } else {
    document.addEventListener('alpine:init', register);
  }
})();
