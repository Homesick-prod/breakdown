'use client';

import React from 'react';
import ReactSelect, { Props as ReactSelectProps, StylesConfig, GroupBase, components, MenuProps } from 'react-select';
import ReactSelectCreatable from 'react-select/creatable';

function CustomMenu<Option, IsMulti extends boolean, Group extends GroupBase<Option>>(
  props: MenuProps<Option, IsMulti, Group>
) {
  const [align, setAlign] = React.useState<'left' | 'right'>('left');
  const [placement, setPlacement] = React.useState<'top' | 'bottom'>('bottom');
  const [coords, setCoords] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const updatePosition = React.useCallback(() => {
    const instanceId = props.selectProps.instanceId;
    if (!instanceId) return;

    let control: HTMLElement | null = null;
    const menuEl = menuRef.current;
    if (menuEl) {
      let parent = menuEl.parentElement;
      while (parent && parent !== document.body) {
        const found = parent.querySelector('.dark-select__control') || 
                      parent.querySelector('[class$="__control"]') ||
                      parent.querySelector('[id$="-control"]');
        if (found) {
          control = found as HTMLElement;
          break;
        }
        parent = parent.parentElement;
      }
    }

    if (!control) {
      control = document.getElementById(`react-select-${instanceId}-control`);
    }

    if (!control) {
      try {
        const escapedId = instanceId.replace(/:/g, '\\:');
        control = document.querySelector(`[id$="-control"][id*="${escapedId}"]`) as HTMLElement | null;
      } catch (e) {
        const controls = document.querySelectorAll('[id$="-control"]');
        for (let i = 0; i < controls.length; i++) {
          if (controls[i].id.includes(instanceId)) {
            control = controls[i] as HTMLElement;
            break;
          }
        }
      }
    }

    if (control) {
      const rect = control.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 1. Align to right side if control is on the right half of the screen
      let currentAlign: 'left' | 'right' = 'left';
      if (rect.left + rect.width / 2 > vw / 2) {
        currentAlign = 'right';
      }
      setAlign(currentAlign);

      // 2. Measure menu height and width
      const menuHeight = menuEl ? menuEl.offsetHeight : 280; // fallback estimate
      const menuWidth = menuEl ? menuEl.offsetWidth : rect.width;

      // 3. Determine if there is space below
      const spaceBelow = vh - rect.bottom;
      const spaceAbove = rect.top;

      let currentPlacement: 'top' | 'bottom' = 'bottom';
      if (spaceBelow < menuHeight + 10 && spaceAbove > spaceBelow) {
        currentPlacement = 'top';
      }
      setPlacement(currentPlacement);

      // 4. Calculate fixed coords
      const top = currentPlacement === 'bottom'
        ? rect.bottom + 4
        : rect.top - menuHeight - 4;

      let left = rect.left;
      if (currentAlign === 'right') {
        left = rect.right - menuWidth;
      }

      // Keep it within screen bounds
      if (left < 10) {
        left = 10;
      } else if (left + menuWidth > vw - 10) {
        left = vw - menuWidth - 10;
      }

      setCoords({
        top,
        left,
        width: rect.width
      });
    }
  }, [props.selectProps.instanceId]);

  React.useLayoutEffect(() => {
    updatePosition();

    let resizeObserver: ResizeObserver | null = null;
    if (menuRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updatePosition();
      });
      resizeObserver.observe(menuRef.current);
    }

    // Capture scrolls on any parent container, plus window resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition, true);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition, true);
    };
  }, [updatePosition]);

  const style: React.CSSProperties = coords ? {
    position: 'fixed',
    top: `${coords.top}px`,
    left: `${coords.left}px`,
    minWidth: `${coords.width}px`,
    zIndex: 99999,
  } : {
    position: 'fixed',
    opacity: 0,
    pointerEvents: 'none',
  };

  return (
    <components.Menu {...props}>
      <div 
        ref={menuRef} 
        className="dark-select-menu-card" 
        data-align={align} 
        data-placement={placement}
        style={style}
      >
        {props.children}
      </div>
    </components.Menu>
  );
}

// Dark theme styles matching our CSS design tokens
function buildDarkStyles<Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>(): StylesConfig<Option, IsMulti, Group> {
  return {
    control: (base, state) => ({
      ...base,
      backgroundColor: 'var(--bg-input)',
      borderColor: state.isFocused ? 'var(--accent-primary)' : 'var(--border-default)',
      borderRadius: 'var(--radius-sm)',
      minHeight: '36px',
      boxShadow: state.isFocused ? 'inset 0 1px 2px rgba(0,0,0,0.075), 0 0 0 2px var(--accent-glow)' : 'inset 0 1px 2px rgba(0,0,0,0.075)',
      '&:hover': { borderColor: state.isFocused ? 'var(--accent-primary)' : 'var(--border-strong)' },
      cursor: 'pointer',
      fontSize: '13px',
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '2px 10px',
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--text-primary)',
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
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '0',
      boxShadow: 'none',
      overflow: 'visible',
      zIndex: 9999,
      marginTop: '0',
      width: '100%',
    }),
    menuList: (base, state) => {
      const options = state.selectProps.options || [];
      const isGrouped = options.length > 0 && options[0] !== null && typeof options[0] === 'object' && 'options' in options[0];
      const groupCount = isGrouped ? options.length : 0;
      return {
        ...base,
        padding: '12px 14px',
        maxHeight: 'none',
        display: 'grid',
        gridTemplateColumns: groupCount > 1 ? 'repeat(2, minmax(130px, 1fr))' : '1fr',
        gap: '16px 20px',
        overflow: 'visible',
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

type DarkSelectProps<Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>> =
  Omit<ReactSelectProps<Option, IsMulti, Group>, 'value' | 'onChange'> & {
    instanceId?: string;
    value?: any;
    onChange?: (value: any, actionMeta: any) => void;
    constrainOnePerGroup?: boolean;
    isCreatable?: boolean;
    useChips?: boolean;
  };

export function DarkSelect<
  Option = unknown,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({ instanceId, formatOptionLabel, components: customComponents, value, onChange, options, isMulti, constrainOnePerGroup = false, isCreatable = false, useChips = false, ...props }: DarkSelectProps<Option, IsMulti, Group>) {
  const fallbackId = React.useId();
  const safeId = instanceId ?? `dark-select-${fallbackId}`;

  const defaultFormatOptionLabel = (opt: Option, { context }: { context: 'value' | 'menu' }) => {
    if (context === 'value') {
      return getShortLabel(opt);
    }
    return getFullLabel(opt);
  };

  // 1. Resolve option value from string or object format
  const resolvedValue = React.useMemo(() => {
    if (!value) return isMulti ? [] : null;
    if (typeof value === 'object') return value;

    const strVal = String(value);
    const selectOptions = (options as any as SelectGroup[]) || [];

    if (isMulti) {
      const values = strVal.split(',').map(s => s.trim()).filter(Boolean);
      const foundOptions: any[] = [];
      values.forEach(val => {
        const opt = findOption(selectOptions, val);
        if (opt) {
          foundOptions.push(opt);
        } else if (isCreatable) {
          foundOptions.push({ value: val, label: val });
        }
      });
      return foundOptions;
    }

    const opt = findOption(selectOptions, strVal);
    if (!opt && isCreatable) {
      return { value: strVal, label: strVal };
    }
    return opt;
  }, [value, isMulti, options, isCreatable]);

  // 2. Intercept onChange to format as comma-separated string & enforce 1-per-category constraint
  const handleOnChange = (newValue: any, actionMeta: any) => {
    if (!onChange) return;

    if (isMulti) {
      let arr = Array.isArray(newValue) ? newValue : [];

      // Enforce the constraint: only 1 option per category (group)
      if (constrainOnePerGroup && actionMeta.action === 'select-option' && actionMeta.option) {
        const addedOpt = actionMeta.option;
        let targetGroupLabel = '';
        const selectOptions = options as any as SelectGroup[];

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

      const joinedValues = arr.map((opt: any) => opt.value).join(',');
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
        Menu: CustomMenu,
        ...customComponents
      }
    : {
        Menu: CustomMenu,
        MultiValue: CustomMultiValue,
        MultiValueContainer: ({ children }) => <>{children}</>,
        MultiValueRemove: () => null,
        ...customComponents
      };

  return (
    <SelectComponent<Option, IsMulti, Group>
      formatOptionLabel={formatOptionLabel || defaultFormatOptionLabel}
      components={defaultComponents}
      value={resolvedValue as any}
      onChange={handleOnChange as any}
      options={options}
      isMulti={isMulti}
      hideSelectedOptions={false}
      isClearable={false}
      instanceId={safeId}
      styles={buildDarkStyles<Option, IsMulti, Group>()}
      classNamePrefix="dark-select"
      menuPosition="fixed"
      {...props}
    />
  );
}

// ── Helpers for building option lists with groups ──────────────────────────

export type SelectOption = { value: string; label: string };
export type SelectGroup = { label: string; options: SelectOption[] };

export const SHOT_SIZE_OPTIONS: SelectGroup[] = [
  {
    label: 'Wide & Full', options: [
      { value: 'EWS', label: 'EWS — Extreme Wide' },
      { value: 'WS', label: 'WS — Wide Shot' },
      { value: 'FS', label: 'FS — Full Shot' },
    ]
  },
  {
    label: 'Mediums', options: [
      { value: 'Cowboy', label: 'Cowboy Shot' },
      { value: 'MS', label: 'MS — Medium Shot' },
      { value: 'MCU', label: 'MCU — Medium Close-Up' },
    ]
  },
  {
    label: 'Close-Ups', options: [
      { value: 'CU', label: 'CU — Close-Up' },
      { value: 'ECU', label: 'ECU — Extreme Close-Up' },
      { value: 'Insert', label: 'Insert Shot' },
    ]
  },
  {
    label: 'Groupings & Function', options: [
      { value: '2S', label: 'Two-Shot' },
      { value: '3S', label: 'Three-Shot' },
      { value: 'Group', label: 'Group Shot' },
      { value: 'EST', label: 'EST — Establishing Shot' },
      { value: 'Cutaway', label: 'Cutaway' },
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
      { value: 'Static', label: 'Static / Tripod' },
      { value: 'Pan', label: 'Pan (L/R)' },
      { value: 'Tilt', label: 'Tilt (Up/Down)' },
    ]
  },
  {
    label: 'Dynamic / Track', options: [
      { value: 'Push In', label: 'Push In / Dolly In' },
      { value: 'Pull Out', label: 'Pull Out / Dolly Out' },
      { value: 'Track', label: 'Track / Follow' },
    ]
  },
  {
    label: 'Gear / Rig', options: [
      { value: 'Handheld', label: 'Handheld' },
      { value: 'Steadicam', label: 'Steadicam / Gimbal' },
      { value: 'Crane', label: 'Crane / Jib' },
      { value: 'Drone', label: 'Drone / Aerial' },
    ]
  },
  {
    label: 'Lens', options: [
      { value: 'Zoom In', label: 'Zoom In' },
      { value: 'Zoom Out', label: 'Zoom Out' },
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
