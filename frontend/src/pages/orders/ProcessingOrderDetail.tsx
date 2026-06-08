import { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Timeline, Button, Space, Table, Modal, Form, Input, InputNumber, message, Row, Col, Progress } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { orderApi } from '../../services/api';
import { formatMoney, formatDate, formatDateTime, orderStatusMap, nodeNameMap } from '../../utils/format';
import { ProcessingOrder, OrderNodeTimeline } from '../../types';
import { useAuthContext } from '../../App';

const ProcessingOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [order, setOrder] = useState<ProcessingOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [advanceVisible, setAdvanceVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const data = await orderApi.getProcessingOrder(id!);
      setOrder(data);
    } catch (e) {
      console.error(e);
      message.error('加载订单详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvance = async (values: any) => {
    try {
      await orderApi.advanceOrder(id!, values);
      message.success('节点推进成功');
      setAdvanceVisible(false);
      form.resetFields();
      loadOrder();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  const getCurrentNodeIndex = () => {
    if (!order?.nodeTimeline) return -1;
    return order.nodeTimeline.findIndex(n => n.status === 'processing' || n.status === 'pending');
  };

  const canAdvance = () => {
    if (!order || !user) return false;
    if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'rejected') return false;
    
    const role = user.role;
    const currentNode = order.currentNode;
    
    if (role === 'factory') {
      return ['reviewed', 'scheduled', 'material_picked', 'processing', 'initial_inspection', 'reinspection', 'packaging'].includes(currentNode);
    }
    if (role === 'demander') {
      return ['pending_review', 'delivered'].includes(currentNode);
    }
    return false;
  };

  const getAdvanceButtonText = () => {
    if (!order) return '';
    const nodeMap: Record<string, string> = {
      pending_review: '接单',
      reviewed: '开始排产',
      scheduled: '确认领料',
      material_picked: '开始加工',
      processing: '提交初检',
      initial_inspection: '提交复检',
      reinspection: '开始包装',
      packaging: '确认发货',
      shipped: '确认送达',
      delivered: '完成订单'
    };
    return nodeMap[order.currentNode] || '推进节点';
  };

  const materialColumns = [
    {
      title: '物料编号',
      dataIndex: 'orderNo',
      key: 'orderNo'
    },
    {
      title: '物料名称',
      dataIndex: 'materialName',
      key: 'materialName'
    },
    {
      title: '规格',
      dataIndex: 'specification',
      key: 'specification'
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (val: number, record: any) => `${val} ${record.unit}`
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => formatMoney(val)
    },
    {
      title: '供应商',
      dataIndex: 'supplierName',
      key: 'supplierName'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = orderStatusMap[status as keyof typeof orderStatusMap] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    }
  ];

  if (!order && !loading) {
    return <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>;
  }

  const statusInfo = orderStatusMap[order?.status as keyof typeof orderStatusMap] || { text: order?.status, color: 'default' };

  return (
    <div>
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
          <h2 className="page-title">加工订单详情</h2>
          <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
        </Space>
      </div>

      <div className="page-content">
        <Row gutter={16}>
          <Col span={16}>
            <Card title="订单信息" className="card-shadow" style={{ marginBottom: 16 }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="订单编号">{order?.orderNo}</Descriptions.Item>
                <Descriptions.Item label="订单状态">
                  <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="零件名称">{order?.partName}</Descriptions.Item>
                <Descriptions.Item label="零件编号">{order?.partCode}</Descriptions.Item>
                <Descriptions.Item label="需求方">{order?.demanderName}</Descriptions.Item>
                <Descriptions.Item label="加工厂">{order?.factoryName}</Descriptions.Item>
                <Descriptions.Item label="数量">{order?.quantity} 件</Descriptions.Item>
                <Descriptions.Item label="单价">{formatMoney(order?.unitPrice || 0)}</Descriptions.Item>
                <Descriptions.Item label="总金额">
                  <span style={{ color: '#f5222d', fontWeight: 'bold' }}>{formatMoney(order?.totalAmount || 0)}</span>
                </Descriptions.Item>
                <Descriptions.Item label="交货日期">{formatDate(order?.deliveryDate)}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{formatDateTime(order?.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{formatDateTime(order?.updatedAt)}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="加工要求" className="card-shadow" style={{ marginBottom: 16 }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="工艺标准">{order?.processStandard || '-'}</Descriptions.Item>
                <Descriptions.Item label="公差要求">{order?.toleranceRequirement || '-'}</Descriptions.Item>
                <Descriptions.Item label="损耗率阈值">{order?.lossRateThreshold}%</Descriptions.Item>
                <Descriptions.Item label="不良率阈值">{order?.defectRateThreshold}%</Descriptions.Item>
                {order?.actualLossRate !== undefined && (
                  <Descriptions.Item label="实际损耗率">
                    <span style={{ color: order.actualLossRate > (order?.lossRateThreshold || 0) ? '#f5222d' : '#52c41a' }}>
                      {order.actualLossRate}%
                    </span>
                  </Descriptions.Item>
                )}
                {order?.actualDefectRate !== undefined && (
                  <Descriptions.Item label="实际不良率">
                    <span style={{ color: order.actualDefectRate > (order?.defectRateThreshold || 0) ? '#f5222d' : '#52c41a' }}>
                      {order.actualDefectRate}%
                    </span>
                  </Descriptions.Item>
                )}
                {order?.deductionAmount !== undefined && order.deductionAmount > 0 && (
                  <Descriptions.Item label="扣款金额">
                    <span style={{ color: '#f5222d', fontWeight: 'bold' }}>-{formatMoney(order.deductionAmount)}</span>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="备注" span={2}>{order?.remarks || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            {order?.materialOrders && order.materialOrders.length > 0 && (
              <Card title="关联原料订单" className="card-shadow" style={{ marginBottom: 16 }}>
                <Table
                  columns={materialColumns}
                  dataSource={order.materialOrders}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Card>
            )}

            {order?.drawings && order.drawings.length > 0 && (
              <Card title="加工图纸" className="card-shadow">
                <Space wrap>
                  {order.drawings.map((d: any) => (
                    <Button key={d.id} icon={<FileTextOutlined />}>
                      {d.fileName}
                    </Button>
                  ))}
                </Space>
              </Card>
            )}
          </Col>

          <Col span={8}>
            <Card 
              title="订单流程" 
              className="card-shadow"
              extra={canAdvance() && (
                <Button type="primary" onClick={() => setAdvanceVisible(true)}>
                  {getAdvanceButtonText()}
                </Button>
              )}
              style={{ marginBottom: 16 }}
            >
              <Timeline
                items={order?.nodeTimeline?.map((node: OrderNodeTimeline) => {
                  const color = node.status === 'completed' ? 'green' : 
                                node.status === 'processing' ? 'blue' :
                                node.status === 'timeout' ? 'red' : 'gray';
                  const dot = node.status === 'completed' ? <CheckCircleOutlined /> :
                              node.status === 'processing' ? <ClockCircleOutlined /> :
                              node.status === 'timeout' ? <WarningOutlined /> : undefined;
                  return {
                    color,
                    dot,
                    children: (
                      <div>
                        <div style={{ fontWeight: node.status === 'processing' ? 'bold' : 'normal' }}>
                          {nodeNameMap[node.node] || node.node}
                        </div>
                        <div style={{ fontSize: 12, color: '#999' }}>
                          {node.startedAt && `开始: ${formatDateTime(node.startedAt)}`}
                          {node.completedAt && <br />}
                          {node.completedAt && `完成: ${formatDateTime(node.completedAt)}`}
                          {node.status === 'timeout' && <div style={{ color: '#f5222d' }}>已超时</div>}
                        </div>
                      </div>
                    )
                  };
                })}
              />
            </Card>

            {order?.deductionAmount !== undefined && order.deductionAmount > 0 && (
              <Card title="扣款明细" className="card-shadow">
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <Progress 
                    type="dashboard" 
                    percent={Math.min(100, ((order?.actualLossRate || 0) / (order?.lossRateThreshold || 1)) * 50 + ((order?.actualDefectRate || 0) / (order?.defectRateThreshold || 1)) * 50)} 
                    format={() => formatMoney(order?.deductionAmount || 0)}
                    strokeColor="#f5222d"
                  />
                  <div style={{ marginTop: 10, color: '#f5222d', fontWeight: 'bold' }}>
                    累计扣款金额
                  </div>
                </div>
              </Card>
            )}
          </Col>
        </Row>
      </div>

      <Modal
        title={getAdvanceButtonText()}
        open={advanceVisible}
        onCancel={() => setAdvanceVisible(false)}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleAdvance}>
          {(order?.currentNode === 'initial_inspection' || order?.currentNode === 'reinspection') && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="defectCount"
                  label="不良品数量"
                  initialValue={0}
                >
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="lossCount"
                  label="损耗数量"
                  initialValue={0}
                >
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          )}
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">确认提交</Button>
              <Button onClick={() => setAdvanceVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProcessingOrderDetail;
