/* eslint-disable no-console */
import React, { FC } from 'react';
import classNames from 'classnames';
import { Field as RcField } from 'rc-field-form';
import FieldContext from 'rc-field-form/lib/FieldContext';
import type { Meta } from 'rc-field-form/lib/interface';
import Field from '../field';
import type {
  FormItemLayoutProps,
  FormItemProps,
  MemoInputProps,
  RenderChildren,
} from './PropsType';
import { toArray } from '../uploader/utils';
import { FIELD_KEY } from '../field/Field';
import { COMPONENT_TYPE_KEY } from '../utils/constant';

function devWarning(component: string, message: string): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[${component}] ${message}`);
  }
}

const classPrefix = `rv-form-item`;

const MemoInput = React.memo(
  ({ children, ...props }: MemoInputProps) =>
    React.cloneElement(children as React.ReactElement, props) as JSX.Element,
  (prev, next) => prev.value === next.value && prev.update === next.update,
);

const FormItemLayout: React.FC<FormItemLayoutProps> = (props) => {
  const {
    className,
    style,
    label,
    required,
    disabled,
    meta,
    onClick,
    children,
    isFieldChildren,
    tooltip,
    intro,
  } = props;

  const errorMessage = meta && meta.errors.length > 0 ? meta.errors[0] : null;
  const error = !!errorMessage;

  const attrs = {
    className: classNames(classPrefix, className),
    label,
    style,
    disabled,
    tooltip,
    intro,
    required,
    error,
    errorMessage,
    onClick,
  };

  if (isFieldChildren) return React.cloneElement(children as React.ReactElement, attrs);

  return <Field {...attrs}>{children}</Field>;
};

const FormItem: FC<FormItemProps> = (props) => {
  const {
    // 样式相关
    className,
    style,
    // FormItem 相关
    label,
    name,
    required,
    noStyle,
    // Field 相关
    tooltip,
    intro,
    customField,
    disabled,
    rules,
    children,
    messageVariables,
    trigger = 'onChange',
    validateTrigger,
    onClick,
    shouldUpdate,
    dependencies,
    ...fieldProps
  } = props;

  const { validateTrigger: contextValidateTrigger } = React.useContext(FieldContext);
  const mergedValidateTrigger =
    validateTrigger !== undefined ? validateTrigger : contextValidateTrigger;

  const updateRef = React.useRef(0);
  updateRef.current += 1;

  const isFieldChildren =
    (children as { type: unknown }).type?.[COMPONENT_TYPE_KEY] === FIELD_KEY || customField;

  function renderLayout(
    baseChildren: React.ReactNode,
    fieldId?: string,
    meta?: Meta,
    isRequired?: boolean,
  ) {
    if (noStyle) {
      return baseChildren;
    }
    return (
      <FormItemLayout
        isFieldChildren={isFieldChildren}
        className={className}
        style={style}
        label={label}
        tooltip={tooltip}
        intro={intro}
        required={isRequired}
        disabled={disabled}
        htmlFor={fieldId}
        meta={meta}
        onClick={onClick}
      >
        {baseChildren}
      </FormItemLayout>
    );
  }

  const isRenderProps = typeof children === 'function';

  if (!name && !isRenderProps && !props.dependencies) {
    return renderLayout(children) as JSX.Element;
  }

  let variables: Record<string, string> = {};
  if (typeof label === 'string') {
    variables.label = label;
  }
  if (messageVariables) {
    variables = { ...variables, ...messageVariables };
  }

  return (
    <RcField
      {...fieldProps}
      name={name}
      shouldUpdate={shouldUpdate}
      dependencies={dependencies}
      rules={rules}
      trigger={trigger}
      validateTrigger={mergedValidateTrigger}
    >
      {(control, meta, context) => {
        let childNode: React.ReactNode = null;
        const isRequired =
          required !== undefined
            ? required
            : !!(
                rules &&
                rules.some((rule) => {
                  if (rule && typeof rule === 'object' && rule.required) {
                    return true;
                  }
                  return false;
                })
              );

        const fieldId = (toArray(name).length && meta ? meta.name : []).join('_');
        if (shouldUpdate && dependencies) {
          devWarning('Form.Item', "`shouldUpdate` and `dependencies` shouldn't be used together.");
        }

        if (isRenderProps) {
          if ((shouldUpdate || dependencies) && !name) {
            childNode = (children as RenderChildren)(context);
          } else {
            if (!(shouldUpdate || dependencies)) {
              devWarning(
                'Form.Item',
                '`children` of render props only work with `shouldUpdate` or `dependencies`.',
              );
            }
            if (name) {
              devWarning(
                'Form.Item',
                "Do not use `name` with `children` of render props since it's not a field.",
              );
            }
          }

          // not render props
        } else if (dependencies && !name) {
          devWarning(
            'Form.Item',
            'Must set `name` or use render props when `dependencies` is set.',
          );
        } else if (React.isValidElement(children)) {
          const childProps = { ...children.props, ...control };

          if (!childProps.id) {
            childProps.id = fieldId;
          }

          if (disabled) {
            childProps.disabled = disabled;
          }

          // We should keep user origin event handler
          const triggers = new Set<string>([
            ...toArray<string>(trigger),
            ...toArray<string>(mergedValidateTrigger as string),
          ]);

          triggers.forEach((eventName) => {
            childProps[eventName] = (...args) => {
              control[eventName]?.(...args);
              children.props[eventName]?.(...args);
            };
          });

          childNode = (
            <MemoInput value={control[props.valuePropName || 'value']} update={updateRef.current}>
              {React.cloneElement(children, childProps)}
            </MemoInput>
          );

          if (isFieldChildren) {
            childProps.value = childProps.value || '';
            childNode = React.cloneElement(children, childProps);
          }
        } else {
          if (name) {
            devWarning(
              'Form.Item',
              '`name` is only used for validate React element. If you are using Form.Item as layout display, please remove `name` instead.',
            );
          }
          childNode = children;
        }
        return renderLayout(childNode, fieldId, meta, isRequired);
      }}
    </RcField>
  );
};

export default FormItem;
