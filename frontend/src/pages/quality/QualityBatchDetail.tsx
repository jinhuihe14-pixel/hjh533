import { useState, useEffect } from 'react';
import {
  Card, Descriptions, Tag, Timeline, Button, Space, List, Avatar,
  Table, message, Steps, QRCode, Modal
} from 'antd';
import {
  ArrowLeftOutlined, QrcodeOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { qualityApi } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/format';
import { QualityBatch, TraceRecord, QualityInspection, DeductionRule } from '../../types';

const { Step } = Steps;

const QualityBatchDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [batch, setBatch] = useState<QualityBatch | null>(null);
  const [traceRecords, setTraceRecords] = useState<TraceRecord[]>([]);
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [deductionRules, setDeductionRules] = useState<DeductionRule[]>([]);
  const [qrModal, setQrModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadDetail();
    }
  }, [id]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data = await qualityApi.getBatch(id!);
      setBatch(data);
      setTraceRecords(data.traceRecords || []);
      setInspections(data.inspectionsData || []);
      setDeductionRules(data.deductionRules || []);
    } catch (e) {
      console.error(e);
      message.error('加载批次详情失败');
    } finally {
      setLoading(false);
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'pass':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'fail':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  const getResultTag = (result: string) => {
    const colorMap: Record<string, string> = {
      pass: 'green',
      fail: 'red',
      pending: 'orange'
    };
    const textMap: Record<string, string> = {
      pass: '合格',
      fail: '不合格',
      pending: '待检验'
    };
    return <Tag color={colorMap[result]}>{textMap[result]}</Tag>;
  };

  const getSeverityTag = (severity: string) => {
    const colorMap: Record<string, string> = {
      minor: 'blue',
      major: 'orange',
      critical: 'red'
    };
    const textMap: Record<string, string> = {
      minor: '轻微',
      major: '严重',
      critical: '致命'
    };
    return <Tag color={colorMap[severity]}>{textMap[severity]}</Tag>;
  };

  const inspectionColumns = [
    {
      title: '质检单号',
      dataIndex: 'inspectionNo',
      key: 'inspectionNo',
      render: (text: string) => <a>{text}</a>
    },
    {
      title: '质检类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          incoming: '来料检验',
          initial: '初检',
          reinspection: '复检',
          spot_check: '抽检'
        };
        return typeMap[type] || type;
      }
    },
    {
      title: '检验员',
      dataIndex: 'inspectorName',
      key: 'inspectorName'
    },
    {
      title: '送检数量',
      dataIndex: 'inspectedQuantity',
      key: 'inspectedQuantity'
    },
    {
      title: '合格数',
      dataIndex: 'passedQuantity',
      key: 'passedQuantity'
    },
    {
      title: '不合格数',
      dataIndex: 'failedQuantity',
      key: 'failedQuantity'
    },
    {
      title: '不良率',
      dataIndex: 'defectRate',
      key: 'defectRate',
      render: (rate: number) => `${rate}%`
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      render: (result: string) => getResultTag(result)
    },
    {
      title: '检验时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date)
    }
  ];

  const deductionColumns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '缺陷类型',
      dataIndex: 'defectType',
      key: 'defectType'
    },
    {
      title: '扣款类型',
      dataIndex: 'deductionType',
      key: 'deductionType',
      render: (type: string) => {
        const map: Record<string, string> = {
          percentage: '比例扣款',
          fixed: '固定金额',
          per_unit: '按件扣款'
        };
        return map[type] || type;
      }
    },
    {
      title: '扣款值',
      dataIndex: 'deductionValue',
      key: 'deductionValue',
      render: (val: number, record: DeductionRule) => {
        if (record.deductionType === 'percentage') return `${val}%`;
        if (record.deductionType === 'per_unit') return `${val} 元/件`;
        return `${val} 元`;
      }
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? '启用' : '停用'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date)
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/quality/batches')}
        style={{ marginBottom: 16 }}
      >
        返回批次列表
      </Button>

      <Card loading={loading} title="批次基本信息" extra={
        <Button icon={<QrcodeOutlined />} onClick={() => setQrModal(true)}>
          查看溯源码
        </Button>
      }>
        {batch && (
          <Descriptions column={3} bordered size="small">
            <Descriptions.Item label="批次号">{batch.batchNo}</Descriptions.Item>
            <Descriptions.Item label="溯源编码">
              <span style={{ fontFamily: 'monospace' }}>{batch.traceCode}</span>
            </Descriptions.Item>
            <Descriptions.Item label="质检结果">{getResultTag(batch.overallResult)}</Descriptions.Item>
            <Descriptions.Item label="零件名称">{batch.partName}</Descriptions.Item>
            <Descriptions.Item label="零件编号">{batch.partCode}</Descriptions.Item>
            <Descriptions.Item label="数量">{batch.quantity}</Descriptions.Item>
            <Descriptions.Item label="供应商">{batch.supplierName}</Descriptions.Item>
            <Descriptions.Item label="加工厂">{batch.factoryName}</Descriptions.Item>
            <Descriptions.Item label="原料批号">{batch.materialBatchNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="工艺标准">{batch.processStandard || '-'}</Descriptions.Item>
            <Descriptions.Item label="生产日期">{batch.productionDate ? formatDate(batch.productionDate) : '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{formatDateTime(batch.createdAt)}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title="全流程溯源" style={{ marginTop: 16 }} loading={loading}>
        <Timeline
          mode="left"
          items={traceRecords.map((record, index) => ({
            color: index === 0 ? 'blue' : index === traceRecords.length - 1 ? 'green' : 'gray',
            label: formatDateTime(record.timestamp),
            children: (
              <div style={{ paddingBottom: 16 }}>
                <Space>
                  <strong>{record.nodeName}</strong>
                  {record.operatorName && (
                    <Tag color="blue">{record.operatorName}</Tag>
                  )}
                </Space>
                <p style={{ margin: '8px 0', color: '#666' }}>{record.description}</p>
                {record.location && (
                  <p style={{ margin: 0, color: '#999', fontSize: 12 }}>地点: {record.location}</p>
                )}
              </div>
            )
          }))}
        />
      </Card>

      <Card title="质检记录" style={{ marginTop: 16 }} loading={loading}>
        <Table
          columns={inspectionColumns}
          dataSource={inspections}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {deductionRules.length > 0 && (
        <Card title="扣款规则" style={{ marginTop: 16 }} loading={loading}>
          <Table
            columns={deductionColumns}
            dataSource={deductionRules}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      <Modal
        title="溯源二维码"
        open={qrModal}
        onCancel={() => setQrModal(false)}
        footer={[
          <Button key="close" onClick={() => setQrModal(false)}>
            关闭
          </Button>
        ]}
      >
        {batch && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <QRCode value={batch.traceCode} size={200} style={{ margin: '0 auto' }} />
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>{batch.partName}</p>
              <p style={{ color: '#666', margin: '8px 0 0 0' }}>批次号: {batch.batchNo}</p>
              <p style={{ fontFamily: 'monospace', color: '#999' }}>{batch.traceCode}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QualityBatchDetail;
