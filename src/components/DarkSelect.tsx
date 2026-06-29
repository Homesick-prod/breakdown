'use client';

import React from 'react';
import ReactSelect, { Props as ReactSelectProps, StylesConfig, GroupBase } from 'react-select';
import ReactSelectCreatable from 'react-select/creatable';
import { normalizeLegacySelectValue } from '../utils/selectValueFormat';

const MENU_PORTAL_Z_INDEX = 40;
const DEFAULT_MAX_MENU_HEIGHT = 360;
const REACT_SELECT_MIN_MENU_HEIGHT = 120;
const MENU_VIEWPORT_MARGIN = 12;
const MENU_CHROME_HEIGHT = 16;
const DEFAULT_MENU_HEIGHT = DEFAULT_MAX_MENU_HEIGHT + MENU_CHROME_HEIGHT;
const GROUP_MENU_COLUMN_WIDTH = 150;
const GROUP_MENU_HORIZONTAL_PADDING = 48;

type MenuPlacementPreference = 'top' | 'bottom';

function getStyleNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getGroupCount(options: unknown): number {
  if (!Array.isArray(options) || options.length === 0) return 0;
  const isGrouped = options[0] !== null && typeof options[0] === 'object' && 'options' in options[0];
  return isGrouped ? options.length : 0;
}

function getOpenMenuHeight(): number | null {
  if (typeof document === 'undefined') return null;
  const menu = document.querySelector('.dark-select__menu') as HTMLElement | null;
  const menuList = document.querySelector('.dark-select__menu-list') as HTMLElement | null;
  if (!menu || !menuList) return null;
  const menuRectHeight = menu.getBoundingClientRect().height;
  if (menuRectHeight > 0) {
    return Math.ceil(menuRectHeight);
  }

  return Math.min(
    DEFAULT_MENU_HEIGHT,
    Math.ceil(menuList.scrollHeight + MENU_CHROME_HEIGHT)
  );
}

// Dark theme styles matching our CSS design tokens
function buildDarkStyles<Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>(): StylesConfig<Option, IsMulti, Group> {
  return {
    control: (base, state) => ({
      ...base,
      backgroundColor: state.isDisabled ? 'transparent' : 'var(--bg-input)',
      borderColor: state.isDisabled ? 'transparent' : state.isFocused ? 'var(--accent-primary)' : 'var(--border-default)',
      borderRadius: 'var(--radius-sm)',
      minHeight: '36px',
      boxShadow: state.isDisabled ? 'none' : state.isFocused ? 'inset 0 1px 2px rgba(0,0,0,0.075), 0 0 0 2px var(--accent-glow)' : 'inset 0 1px 2px rgba(0,0,0,0.075)',
      '&:hover': { borderColor: state.isDisabled ? 'transparent' : state.isFocused ? 'var(--accent-primary)' : 'var(--border-strong)' },
      cursor: state.isDisabled ? 'default' : 'pointer',
      fontSize: '13px',
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '2px 10px',
    }),
    singleValue: (base, state) => ({
      ...base,
      color: state.isDisabled ? 'var(--text-secondary)' : 'var(--text-primary)',
      fontSize: '13px',
      fontWeight: 500,
    }),
    placeholder: (base) => ({
      ...base,
      color: 'var(--text-muted)',
      fontSize: '13px',
    }),
    input: (base) => ({
      ...base,
      color: 'var(--text-primary)',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base, state) => ({
      ...base,
      display: state.isDisabled ? 'none' : 'block',
      color: state.isFocused ? 'var(--accent-primary)' : 'var(--text-muted)',
      padding: '0 6px',
      transition: 'color 0.2s, transform 0.2s',
      transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      '&:hover': { color: 'var(--accent-primary)' },
      '& svg': {
        width: '15px !important',
        height: '15px !important',
      },
    }),
    clearIndicator: (base) => ({
      ...base,
      color: 'var(--text-muted)',
      padding: '0 4px',
      '&:hover': { color: '#ef4444' },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-sm)',
      boxShadow: 'var(--shadow-lg)',
      boxSizing: 'border-box',
      overflow: 'hidden',
      zIndex: MENU_PORTAL_Z_INDEX,
      marginTop: '4px',
      marginBottom: '4px',
      width: '100%',
      maxWidth: 'calc(100vw - 20px)',
      animation: 'dropdownAppear 0.12s ease-out',
    }),
    menuPortal: (base, state) => {
      const viewportWidth = typeof window === 'undefined' ? null : window.innerWidth;
      const baseLeft = getStyleNumber(base.left);
      const baseWidth = getStyleNumber(base.width);
      const isMenuVisible = (state.selectProps as any).menuIsFullyVisible !== false;

      if (!viewportWidth || baseLeft === null || baseWidth === null) {
        return {
          ...base,
          opacity: isMenuVisible ? 1 : 0,
          pointerEvents: isMenuVisible ? 'auto' : 'none',
          zIndex: MENU_PORTAL_Z_INDEX,
        };
      }

      const groupCount = getGroupCount(state.selectProps.options);
      const preferredGroupWidth = groupCount > 1
        ? groupCount * GROUP_MENU_COLUMN_WIDTH + GROUP_MENU_HORIZONTAL_PADDING
        : Math.max(baseWidth, 140);
      const width = Math.min(
        Math.max(baseWidth, preferredGroupWidth),
        viewportWidth - MENU_VIEWPORT_MARGIN * 2
      );
      const left = Math.min(
        Math.max(MENU_VIEWPORT_MARGIN, baseLeft),
        viewportWidth - width - MENU_VIEWPORT_MARGIN
      );

      return {
        ...base,
        left,
        width,
        opacity: isMenuVisible ? 1 : 0,
        pointerEvents: isMenuVisible ? 'auto' : 'none',
        zIndex: MENU_PORTAL_Z_INDEX,
      };
    },
    menuList: (base, state) => {
      const groupCount = getGroupCount(state.selectProps.options);
      return {
        ...base,
        padding: '12px 14px',
        maxHeight: DEFAULT_MAX_MENU_HEIGHT,
        display: 'grid',
        gridTemplateColumns: groupCount > 1 ? 'repeat(auto-fit, minmax(130px, 1fr))' : '1fr',
        gap: '16px 20px',
        overflowX: 'hidden',
        overflowY: 'auto',
      };
    },
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? 'var(--accent-primary)'
        : state.isFocused
          ? 'var(--bg-elevated)'
          : 'transparent',
      color: state.isSelected ? '#ffffff' : 'var(--text-primary)',
      borderRadius: '4px',
      fontSize: '13px',
      fontWeight: 500,
      padding: '6px 12px',
      cursor: 'pointer',
      transition: 'background 0.1s',
      '&:active': { backgroundColor: 'var(--border-subtle)' },
    }),
    group: (base) => ({
      ...base,
      padding: '0',
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    }),
    groupHeading: (base, state) => {
      const options = state.selectProps.options || [];
      const isGrouped = options.length > 0 && options[0] !== null && typeof options[0] === 'object' && 'options' in options[0];
      const groupCount = isGrouped ? options.length : 0;
      const showHeaderStyles = groupCount > 1;

      return {
        ...base,
        color: 'var(--text-primary)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: showHeaderStyles ? '0 0 6px 0' : '0',
        borderBottom: showHeaderStyles ? '1px solid var(--border-subtle)' : 'none',
        marginBottom: showHeaderStyles ? '6px' : '0',
        display: showHeaderStyles || (options[0] && (options[0] as any).label) ? 'block' : 'none',
      };
    },
    noOptionsMessage: (base) => ({
      ...base,
      color: 'var(--text-muted)',
      fontSize: '13px',
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: '6px',
      margin: '2px 4px 2px 0',
      display: 'inline-flex',
      alignItems: 'center',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: 'var(--text-primary)',
      fontSize: '12px',
      fontWeight: 500,
      padding: '2px 6px',
      paddingRight: '4px',
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: 'var(--text-muted)',
      borderRadius: '0 5px 5px 0',
      padding: '0 4px',
      cursor: 'pointer',
      transition: 'background-color 0.15s, color 0.15s',
      '&:hover': {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#ef4444',
      },
    }),
  };
}

function getShortLabel(option: any): string {
  if (!option) return '';
  const label = option.label ? String(option.label) : '';
  const value = option.value ? String(option.value) : '';
  
  if (value === 'INT/EXT') return 'I/E';
  if (value === 'INT') return 'I';
  if (value === 'EXT') return 'E';

  if (!label) return value;

  if (value && value === value.toUpperCase()) {
    return value;
  }

  // 1. If there's an em-dash/en-dash/hyphen with spaces, e.g., "EWS — Extreme Wide"
  if (label.includes(' — ')) {
    return label.split(' — ')[0].trim();
  }
  if (label.includes(' - ')) {
    return label.split(' - ')[0].trim();
  }
  
  // 2. If there are parentheses containing an uppercase abbreviation, e.g. "Over-the-Shoulder (OTS)"
  const parenMatch = label.match(/\((HTML|SVG|[A-Z0-9]{2,})\)/);
  if (parenMatch) {
    return parenMatch[1];
  }
  
  // 3. Fallback: if the value is shorter than the label, use the value
  if (value && value.length < label.length) {
    return value;
  }
  
  return label;
}

function getFullLabel(option: any): string {
  if (!option) return '';
  const label = option.label ? String(option.label) : '';
  
  // 1. If there's an em-dash/en-dash/hyphen with spaces, take the second part
  if (label.includes(' — ')) {
    return label.split(' — ')[1].trim();
  }
  if (label.includes(' - ')) {
    return label.split(' - ')[1].trim();
  }
  
  // 2. If there are parentheses containing an uppercase abbreviation, strip them
  const parenAbbrMatch = label.match(/\s*\(([A-Z0-9]{2,})\)/);
  if (parenAbbrMatch) {
    return label.replace(parenAbbrMatch[0], '').trim();
  }
  
  return label;
}

function getSelectValueTokens(value: any, isMulti?: boolean): string[] {
  if (!value || typeof value === 'object') return [];
  const strVal = String(value);
  if (isMulti) {
    return strVal.split(',').map(s => normalizeLegacySelectValue(s.trim())).filter(Boolean);
  }
  return [normalizeLegacySelectValue(strVal)].filter(Boolean);
}

function addCurrentValueOptions(groups: SelectGroup[], currentValues: string[]): SelectGroup[] {
  const seenValues = new Set<string>();
  const orphanOptions = currentValues
    .filter(value => {
      if (!value || findOption(groups, value) || seenValues.has(value)) return false;
      seenValues.add(value);
      return true;
    })
    .map(value => ({ value, label: value }));

  if (orphanOptions.length === 0) return groups;
  return [{ label: 'Current', options: orphanOptions }, ...groups];
}

type DarkSelectProps<Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>> =
  Omit<ReactSelectProps<Option, IsMulti, Group>, 'value' | 'onChange'> & {
    instanceId?: string;
    value?: any;
    onChange?: (value: any, actionMeta: any) => void;
    constrainOnePerGroup?: boolean;
    constrainShotSize?: boolean;
    isCreatable?: boolean;
    useChips?: boolean;
  };

export function DarkSelect<
  Option = unknown,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  instanceId,
  formatOptionLabel,
  components: customComponents,
  value,
  onChange,
  options,
  isMulti,
  constrainOnePerGroup = false,
  constrainShotSize = false,
  isCreatable = false,
  useChips = false,
  ...props
}: DarkSelectProps<Option, IsMulti, Group>) {
  const fallbackId = React.useId();
  const safeId = instanceId ?? `dark-select-${fallbackId}`;
  const selectRootRef = React.useRef<HTMLDivElement>(null);
  const [menuPortalTarget, setMenuPortalTarget] = React.useState<HTMLElement | null>(null);
  const [menuHeight, setMenuHeight] = React.useState(DEFAULT_MENU_HEIGHT);
  const [menuPlacement, setMenuPlacement] = React.useState<MenuPlacementPreference>('bottom');
  const [menuIsFullyVisible, setMenuIsFullyVisible] = React.useState(true);
  const [menuIsOpen, setMenuIsOpen] = React.useState(false);

  const updateMenuGeometry = React.useCallback(() => {
    const control = selectRootRef.current?.querySelector('.dark-select__control');
    if (!control) {
      setMenuPlacement('bottom');
      setMenuIsFullyVisible(false);
      return;
    }

    const measuredMenuHeight = getOpenMenuHeight();
    const requiredMenuHeight = measuredMenuHeight ?? menuHeight;
    const rect = control.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - MENU_VIEWPORT_MARGIN;
    const spaceAbove = rect.top - MENU_VIEWPORT_MARGIN;
    let nextPlacement: MenuPlacementPreference = 'bottom';
    let nextIsFullyVisible = true;

    if (spaceBelow >= requiredMenuHeight) {
      nextPlacement = 'bottom';
    } else if (spaceAbove >= requiredMenuHeight) {
      nextPlacement = 'top';
    } else {
      nextPlacement = spaceAbove > spaceBelow ? 'top' : 'bottom';
      nextIsFullyVisible = false;
    }

    if (measuredMenuHeight && measuredMenuHeight !== menuHeight) {
      setMenuHeight(measuredMenuHeight);
    }
    setMenuPlacement(nextPlacement);
    setMenuIsFullyVisible(nextIsFullyVisible);
  }, [menuHeight]);

  React.useEffect(() => {
    setMenuPortalTarget(document.body);
  }, []);

  React.useEffect(() => {
    if (!menuIsOpen) return;

    updateMenuGeometry();
    const animationFrame = window.requestAnimationFrame(updateMenuGeometry);
    window.addEventListener('resize', updateMenuGeometry, { passive: true });
    window.addEventListener('scroll', updateMenuGeometry, { passive: true, capture: true });
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', updateMenuGeometry);
      window.removeEventListener('scroll', updateMenuGeometry, { capture: true } as AddEventListenerOptions);
    };
  }, [menuIsOpen, updateMenuGeometry]);

  const handleMenuOpen = React.useCallback(() => {
    setMenuIsFullyVisible(true);
    updateMenuGeometry();
    setMenuIsOpen(true);
    props.onMenuOpen?.();
  }, [props, updateMenuGeometry]);

  const handleMenuClose = React.useCallback(() => {
    setMenuIsOpen(false);
    setMenuIsFullyVisible(true);
    props.onMenuClose?.();
  }, [props]);

  const defaultFormatOptionLabel = (opt: Option, { context }: { context: 'value' | 'menu' }) => {
    if (context === 'value') {
      return getShortLabel(opt);
    }
    return getFullLabel(opt);
  };

  const currentValueTokens = React.useMemo(
    () => getSelectValueTokens(value, Boolean(isMulti)),
    [value, isMulti]
  );

  const effectiveOptions = React.useMemo(() => {
    const selectOptions = (options as any as SelectGroup[]) || [];
    return addCurrentValueOptions(selectOptions, currentValueTokens);
  }, [options, currentValueTokens]);

  // 1. Resolve option value from string or object format
  const resolvedValue = React.useMemo(() => {
    if (!value) return isMulti ? [] : null;
    if (typeof value === 'object') return value;

    if (isMulti) {
      const foundOptions: any[] = [];
      currentValueTokens.forEach(val => {
        const opt = findOption(effectiveOptions, val);
        if (opt) {
          foundOptions.push(opt);
        } else {
          foundOptions.push({ value: val, label: val });
        }
      });
      return foundOptions;
    }

    const opt = findOption(effectiveOptions, currentValueTokens[0] ?? '');
    if (!opt) {
      const fallbackValue = currentValueTokens[0] ?? String(value);
      return { value: fallbackValue, label: fallbackValue };
    }
    return opt;
  }, [value, isMulti, currentValueTokens, effectiveOptions]);

  // 2. Intercept onChange to format as comma-separated string & enforce 1-per-category constraint
  const handleOnChange = (newValue: any, actionMeta: any) => {
    if (!onChange) return;

    if (isMulti) {
      let arr = Array.isArray(newValue) ? newValue : [];

      // Enforce the constraint: only 1 option per category (group)
      if (constrainOnePerGroup && actionMeta.action === 'select-option' && actionMeta.option) {
        const addedOpt = actionMeta.option;
        let targetGroupLabel = '';
        const selectOptions = effectiveOptions as SelectGroup[];

        for (const group of selectOptions) {
          if (group.options.some(o => o.value === addedOpt.value)) {
            targetGroupLabel = group.label;
            break;
          }
        }

        if (targetGroupLabel) {
          // Filter out other options in the same group that are not the newly added one
          arr = arr.filter((opt: any) => {
            if (opt.value === addedOpt.value) return true;
            const inSameGroup = selectOptions.some(group =>
              group.label === targetGroupLabel && group.options.some(o => o.value === opt.value)
            );
            return !inSameGroup;
          });
        }
      }

      // Special constraint for shot size: one base size plus one option from each utility group.
      if (constrainShotSize && actionMeta.action === 'select-option' && actionMeta.option) {
        const addedOpt = actionMeta.option;
        const selectOptions = effectiveOptions as SelectGroup[];

        let addedGroupLabel = '';
        for (const group of selectOptions) {
          if (group.options.some(o => o.value === addedOpt.value)) {
            addedGroupLabel = group.label;
            break;
          }
        }

        const isBaseSizeGroup = (label: string) =>
          label === 'Wide & Full' || label === 'Mediums' || label === 'Close-Ups';

        if (isBaseSizeGroup(addedGroupLabel)) {
          arr = arr.filter((opt: any) => {
            if (opt.value === addedOpt.value) return true;
            const optGroup = selectOptions.find(group => group.options.some(o => o.value === opt.value));
            const optGroupLabel = optGroup?.label || '';
            return !isBaseSizeGroup(optGroupLabel);
          });
        } else if (addedGroupLabel === 'Grouping' || addedGroupLabel === 'Function') {
          arr = arr.filter((opt: any) => {
            if (opt.value === addedOpt.value) return true;
            const optGroup = selectOptions.find(group => group.options.some(o => o.value === opt.value));
            const optGroupLabel = optGroup?.label || '';
            return optGroupLabel !== addedGroupLabel;
          });
        }
      }

      const joinedValues = arr.map((opt: any) => normalizeLegacySelectValue(String(opt.value))).join(',');
      onChange(joinedValues as any, actionMeta);
    } else {
      onChange(newValue, actionMeta);
    }
  };

  // Custom components to render selected options as a clean, text-based "/ " list instead of chips
  const CustomMultiValue = (valProps: any) => {
    const { index, getValue } = valProps;
    const values = getValue();
    const isLast = index === values.length - 1;
    const optLabel = valProps.selectProps.formatOptionLabel(valProps.data, { context: 'value' });
    return (
      <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>
        {optLabel}{isLast ? '' : ' / '}
      </span>
    );
  };

  const SelectComponent = isCreatable ? ReactSelectCreatable : ReactSelect;

  const defaultComponents = useChips
    ? {
        ...customComponents
      }
    : {
        MultiValue: CustomMultiValue,
        MultiValueContainer: ({ children }: any) => <>{children}</>,
        MultiValueRemove: () => null,
        ...customComponents
      };

  return (
    <div ref={selectRootRef}>
      <SelectComponent<Option, IsMulti, Group>
        formatOptionLabel={formatOptionLabel || defaultFormatOptionLabel}
        components={defaultComponents}
        value={resolvedValue as any}
        onChange={handleOnChange as any}
        options={effectiveOptions as any}
        isMulti={isMulti}
        closeMenuOnSelect={!isMulti}
        hideSelectedOptions={false}
        isClearable={false}
        instanceId={safeId}
        styles={buildDarkStyles<Option, IsMulti, Group>()}
        classNamePrefix="dark-select"
        menuPosition="fixed"
        menuPlacement={menuPlacement}
        menuShouldScrollIntoView={false}
        minMenuHeight={REACT_SELECT_MIN_MENU_HEIGHT}
        maxMenuHeight={DEFAULT_MAX_MENU_HEIGHT}
        menuPortalTarget={menuPortalTarget}
        {...props}
        isSearchable={props.isSearchable ?? isCreatable}
        menuIsFullyVisible={menuIsFullyVisible}
        onMenuOpen={handleMenuOpen}
        onMenuClose={handleMenuClose}
      />
    </div>
  );
}

// ── Helpers for building option lists with groups ──────────────────────────

export type SelectOption = { value: string; label: string };
export type SelectGroup = { label: string; options: SelectOption[] };

export const SHOT_SIZE_OPTIONS: SelectGroup[] = [
  {
    label: 'Wide & Full', options: [
      { value: 'EWS', label: 'EWS — Extreme Wide Shot' },
      { value: 'WS', label: 'WS — Wide Shot' },
      { value: 'FS', label: 'FS — Full Shot' },
    ]
  },
  {
    label: 'Mediums', options: [
      { value: 'COWBOY', label: 'Cowboy Shot' },
      { value: 'MS', label: 'MS — Medium Shot' },
      { value: 'MCU', label: 'MCU — Medium Close-Up Shot' },
    ]
  },
  {
    label: 'Close-Ups', options: [
      { value: 'CU', label: 'CU — Close-Up Shot' },
      { value: 'ECU', label: 'ECU — Extreme Close-Up Shot' },
    ]
  },
  {
    label: 'Grouping', options: [
      { value: '2S', label: 'Two-Shot' },
      { value: '3S', label: 'Three-Shot' },
      { value: 'GROUP', label: 'Group Shot' },
    ]
  },
  {
    label: 'Function', options: [
      { value: 'EST', label: 'Establishing' },
      { value: 'INSERT', label: 'Insert' },
      { value: 'CUTAWAY', label: 'Cutaway' },
    ]
  },
];

export const ANGLE_OPTIONS: SelectGroup[] = [
  {
    label: 'Elevation / Pitch', options: [
      { value: 'Eye Level', label: 'Eye Level' },
      { value: 'High Angle', label: 'High Angle' },
      { value: 'Low Angle', label: 'Low Angle' },
      { value: 'Top Down', label: 'Top Down (Bird\'s Eye)' },
      { value: 'Bottom Up', label: 'Bottom Up (Worm\'s Eye)' },
    ]
  },
  {
    label: 'Perspective', options: [
      { value: 'Profile', label: 'Profile' },
      { value: '3/4', label: '3/4 — Three-Quarter' },
      { value: 'Rear', label: 'Rear' },
      { value: 'OTS', label: 'OTS — Over the Shoulder' },
      { value: 'POV', label: 'POV — Point of View' },
    ]
  },
  {
    label: 'Specialty', options: [
      { value: 'Dutch', label: 'Dutch Angle / Canted' },
    ]
  },
];

export const MOVEMENT_OPTIONS: SelectGroup[] = [
  {
    label: 'Stationary', options: [
      { value: 'STATIC', label: 'Static / Tripod' },
      { value: 'PAN L', label: 'Pan Left' },
      { value: 'PAN R', label: 'Pan Right' },
      { value: 'TILT U', label: 'Tilt Up' },
      { value: 'TILT D', label: 'Tilt Down' },
    ]
  },
  {
    label: 'Dynamic', options: [
      { value: 'DOLLY I', label: 'Dolly In' },
      { value: 'DOLLY O', label: 'Dolly Out' },
      { value: 'TRUCK L', label: 'Truck Left' },
      { value: 'TRUCK R', label: 'Truck Right' },
      { value: 'FOLLOW', label: 'Follow' },
      { value: 'PEDESTAL U', label: 'Pedestal Up' },
      { value: 'PEDESTAL D', label: 'Pedestal Down' },
    ]
  },
  {
    label: 'Gear / Rig', options: [
      { value: 'HANDHELD', label: 'Handheld' },
      { value: 'STEADICAM', label: 'Steadicam' },
      { value: 'GIMBAL', label: 'Gimbal' },
      { value: 'CRANE', label: 'Crane' },
      { value: 'JIB', label: 'Jib' },
      { value: 'DRONE', label: 'Drone' },
      { value: 'AERIAL', label: 'Aerial' },
    ]
  },
  {
    label: 'Lens', options: [
      { value: 'ZOOM I', label: 'Zoom In' },
      { value: 'ZOOM O', label: 'Zoom Out' },
      { value: 'SNAP ZOOM', label: 'Snap Zoom' },
      { value: 'RACK FOCUS', label: 'Rack Focus' },
    ]
  },
  {
    label: 'Complex', options: [
      { value: 'ARC', label: 'Arc' },
      { value: 'ORBIT', label: 'Orbit' },
      { value: 'WHIP PAN L', label: 'Whip Pan Left' },
      { value: 'WHIP PAN R', label: 'Whip Pan Right' },
    ]
  },
];

// INT/EXT and Period options used in ShootingScheduleEditor
export const INT_EXT_OPTIONS: SelectGroup[] = [
  {
    label: '', options: [
      { value: 'INT', label: 'INT' },
      { value: 'EXT', label: 'EXT' },
      { value: 'INT/EXT', label: 'INT/EXT' },
    ]
  },
];

export const PERIOD_OPTIONS: SelectGroup[] = [
  {
    label: '', options: [
      { value: 'DAY', label: 'Day' },
      { value: 'NIGHT', label: 'Night' },
      { value: 'DUSK', label: 'Dusk' },
      { value: 'DAWN', label: 'Dawn' },
    ]
  },
];

/** Find the matching option object from a flat/grouped list by value */
export function findOption(groups: SelectGroup[], value: string): SelectOption | null {
  for (const group of groups) {
    const found = group.options.find(o => o.value === value);
    if (found) return found;
  }
  return null;
}
