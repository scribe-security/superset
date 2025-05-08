import { buildQueryContext, QueryFormData } from '@superset-ui/core';

export default function buildQuery(formData: QueryFormData) {
  const columns: string[] = [
    formData.idCol,
    formData.parentIdCol,
    formData.labelCol,
    formData.colorCol,
    formData.edgeLabelCol,
    formData.edgeColorCol,
    formData.tooltipCol,
  ]
    .filter(c => c)
    .filter((val, idx, arr) => arr.indexOf(val) === idx);

  return buildQueryContext(formData, baseQueryObject => [
    {
      ...baseQueryObject,
      columns,
      metrics: [
        {
          label: 'count',
          expressionType: 'SQL',
          sqlExpression: 'COUNT(*)',
        },
      ],
    },
  ]);
}
