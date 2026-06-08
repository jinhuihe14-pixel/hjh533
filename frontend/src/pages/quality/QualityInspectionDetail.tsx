import { useState, useEffect } from 'react';
import {
  Card, Descriptions, Tag, Button, Space, List, Image, Divider, Table, Row, Col, Statistic
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, ToolOutlined, RollbackOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { qualityApi } from '../../services/api';
import { formatDateTime } from '../../utils/format';
import { QualityInspection, DefectItem, QualityBatch } from '../../types';

const QualityInspectionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inspection, setInspection] = useState<QualityInspection | null>(null);
  const [batch, setBatch] = useState<QualityBatch | null>(null);

  useEffect(() => {
    if (id) {
      loadDetail();
    }
  }, [id]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data: any = await qualityApi.getInspection(id!);
      setInspection(data);
      setBatch(data.batch || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'pass':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />;
      case 'fail':
        return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#faad14', fontSize: 24 }} />;
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

  const getTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      incoming: '来料检验',
      initial: '初检',
      reinspection: '复检',
      spot_check: '抽检'
    };
    return typeMap[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      incoming: 'blue',
      initial: 'cyan',
      reinspection: 'purple',
      spot_check: 'gold'
    };
    return colorMap[type] || 'default';
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

  const getDispositionText = (disposition?: string) => {
    const map: Record<string, string> = {
      rework: '返工',
      return: '退货',
      concession: '特采',
      scrap: '报废'
    };
    return disposition ? map[disposition] || disposition : '-';
  };

  const defectColumns = [
    {
      title: '缺陷名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => getSeverityTag(severity)
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity'
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/quality/inspections')}
        style={{ marginBottom: 16 }}
      >
        返回质检单列表
      </Button>

      <Card loading={loading}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <Space size="middle" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>{inspection?.inspectionNo}</h2>
              {inspection && getResultTag(inspection.result)}
              <Tag color={inspection ? getTypeColor(inspection.type) : 'default'}>
                {inspection ? getTypeText(inspection.type) : ''}
              </Tag>
            </Space>
            <p style={{ color: '#666', margin: 0 }}>
              检验员: {inspection?.inspectorName} | 检验时间: {inspection ? formatDateTime(inspection.createdAt) : '-'}
            </p>
          </div>
          <Space>
            {inspection?.result === 'fail' && !inspection.reworkOrderId && (
              <>
                <Button icon={<ToolOutlined />} type="primary">
                  发起返工
                </Button>
                <Button icon={<RollbackOutlined />} danger>
                  退货
                </Button>
              </>
            )}
            {inspection?.reworkOrderId && (
              <Tag color="orange">已有返工单</Tag>
            )}
          </Space>
        </div>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic title="送检数量" value={inspection?.inspectedQuantity || 0} />
          </Col>
          <Col span={6}>
            <Statistic title="合格数" value={inspection?.passedQuantity || 0} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={6}>
            <Statistic title="不合格数" value={inspection?.failedQuantity || 0} valueStyle={{ color: '#ff4d4f' }} />
          </Col>
          <Col span={6}>
            <Statistic title="不良率" value={inspection?.defectRate || 0} suffix="%" valueStyle={{ color: '#faad14' }} />
          </Col>
        </Row>

        <Divider orientation="left">基本信息</Divider>
        {inspection && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="质检单号">{inspection.inspectionNo}</Descriptions.Item>
            <Descriptions.Item label="质检类型">{getTypeText(inspection.type)}</Descriptions.Item>
            <Descriptions.Item label="关联订单">{inspection.orderId}</Descriptions.Item>
            <Descriptions.Item label="订单类型">{inspection.orderType === 'processing' ? '加工订单' : '原料订单'}</Descriptions.Item>
            <Descriptions.Item label="批次号">
              {batch ? (
                <a onClick={() => navigate(`/quality/batches/${batch.id}`)}>{batch.batchNo}</a>
              ) : (
                inspection.batchId
              )}
            </Descriptions.Item>
            <Descriptions.Item label="零件名称">{batch?.partName || '-'}</Descriptions.Item>
            <Descriptions.Item label="总数量">{inspection.totalQuantity}</Descriptions.Item>
            <Descriptions.Item label="抽检数量">{inspection.inspectedQuantity}</Descriptions.Item>
            <Descriptions.Item label="检验员">{inspection.inspectorName}</Descriptions.Item>
            <Descriptions.Item label="检验时间">{formatDateTime(inspection.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="处置方式">{getDispositionText(inspection.disposition)}</Descriptions.Item>
            <Descriptions.Item label="返工单号">
              {inspection.reworkOrderId || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}

        {inspection?.defectItems && inspection.defectItems.length > 0 && (
          <>
            <Divider orientation="left">缺陷明细</Divider>
            <Table
              columns={defectColumns}
              dataSource={inspection.defectItems}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </>
        )}

        {inspection?.remark && (
          <>
            <Divider orientation="left">备注</Divider>
            <p style={{ color: '#666', whiteSpace: 'pre-wrap' }}>{inspection.remark}</p>
          </>
        )}

        {inspection?.attachments && inspection.attachments.length > 0 && (
          <>
            <Divider orientation="left">质检图片</Divider>
            <Image.PreviewGroup>
              <Space wrap>
                {inspection.attachments.map((img, index) => (
                  <Image
                    key={index}
                    width={120}
                    height={120}
                    src={img}
                    style={{ objectFit: 'cover', borderRadius: 4 }}
                  />
                ))}
              </Space>
            </Image.PreviewGroup>
          </>
        )}
      </Card>
    </div>
  );
};

export default QualityInspectionDetail;
