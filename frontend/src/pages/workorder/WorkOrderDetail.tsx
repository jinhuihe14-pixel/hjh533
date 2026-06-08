import { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Space, message, Row, Col, List, Modal, Form, Input, Select, InputNumber } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, CheckCircleOutlined, WarningOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { workorderApi } from '../../services/api';
import { formatDateTime } from '../../utils/format';
import { MobileWorkOrder, WorkOrderException } from '../../types';
import { useAuthContext } from '../../App';

const { Option } = Select;

const workOrderStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: 'orange' },
  in_progress: { text: '进行中', color: 'blue' },
  completed: { text: '已完成', color: 'green' },
  quality_issue: { text: '质量问题', color: 'red' },
  rework: { text: '返工', color: 'purple' }
};

const exceptionSeverityMap: Record<string, { text: string; color: string }> = {
  low: { text: '低', color: 'blue' },
  medium: { text: '中', color: 'orange' },
  high: { text: '高', color: 'red' }
};

const WorkOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [workOrder, setWorkOrder] = useState<MobileWorkOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [exceptionVisible, setExceptionVisible] = useState(false);
  const [completeVisible, setCompleteVisible] = useState(false);
  const [form] = Form.useForm();
  const [completeForm] = Form.useForm();

  useEffect(() => {
    if (id) {
      loadWorkOrder();
    }
  }, [id]);

  const loadWorkOrder = async () => {
    setLoading(true);
    try {
      const data = await workorderApi.getWorkOrder(id!);
      setWorkOrder(data);
    } catch (e) {
      console.error(e);
      message.error('加载工单详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      await workorderApi.startWorkOrder(id!);
      message.success('工单已开始');
      loadWorkOrder();
    } catch (e: any) {
      message.error(e.message || '开始工单失败');
    }
  };

  const handleComplete = async (values: any) => {
    try {
      await workorderApi.completeWorkOrder(id!, values);
      message.success('工单已完成');
      setCompleteVisible(false);
      completeForm.resetFields();
      loadWorkOrder();
    } catch (e: any) {
      message.error(e.message || '完成工单失败');
    }
  };

  const handleReportException = async (values: any) => {
    try {
      await workorderApi.reportException(id!, values);
      message.success('异常上报成功');
      setExceptionVisible(false);
      form.resetFields();
      loadWorkOrder();
    } catch (e: any) {
      message.error(e.message || '异常上报失败');
    }
  };

  if (!workOrder && !loading) {
    return <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>;
  }

  const statusInfo = workOrderStatusMap[workOrder?.status || ''] || { text: workOrder?.status, color: 'default' };
  const isFactory = user?.role === 'factory';

  return (
    <div>
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
          <h2 className="page-title">工单详情</h2>
          <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
        </Space>
      </div>

      <div className="page-content">
        <Row gutter={16}>
          <Col span={16}>
            <Card title="基本信息" className="card-shadow" style={{ marginBottom: 16 }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="工单号">{workOrder?.workOrderNo}</Descriptions.Item>
                <Descriptions.Item label="加工单号">
                  {workOrder?.processingOrderNo && (
                    <a onClick={() => navigate(`/orders/processing/${workOrder.processingOrderId}`)}>
                      {workOrder.processingOrderNo}
                    </a>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="零件名称">{workOrder?.partName}</Descriptions.Item>
                <Descriptions.Item label="零件编号">{workOrder?.partCode}</Descriptions.Item>
                <Descriptions.Item label="工序名称">{workOrder?.processName}</Descriptions.Item>
                <Descriptions.Item label="工序序号">{workOrder?.processIndex}</Descriptions.Item>
                <Descriptions.Item label="数量">{workOrder?.quantity}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">{formatDateTime(workOrder?.createdAt)}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="进度信息" className="card-shadow" style={{ marginBottom: 16 }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="开始时间">
                  {workOrder?.startTime ? formatDateTime(workOrder.startTime) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="结束时间">
                  {workOrder?.endTime ? formatDateTime(workOrder.endTime) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="产出数量">
                  {workOrder?.outputQuantity !== undefined ? workOrder.outputQuantity : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="不良数量">
                  {workOrder?.defectQuantity !== undefined ? workOrder.defectQuantity : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="负责人" span={2}>
                  {workOrder?.assigneeName || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="异常记录" className="card-shadow">
              {workOrder?.exceptions && workOrder.exceptions.length > 0 ? (
                <List
                  size="small"
                  dataSource={workOrder.exceptions}
                  renderItem={(item: WorkOrderException) => (
                    <List.Item
                      actions={[
                        <Button type="link" size="small" onClick={() => navigate(`/workorder/exceptions/${item.id}`)}>
                          查看
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space>
                            <span>{item.typeName}</span>
                            <Tag color={exceptionSeverityMap[item.severity]?.color || 'default'}>
                              {exceptionSeverityMap[item.severity]?.text || item.severity}
                            </Tag>
                            <Tag color={item.status === 'pending' ? 'orange' : item.status === 'processing' ? 'blue' : item.status === 'resolved' ? 'green' : 'red'}>
                              {item.status === 'pending' ? '待处理' : item.status === 'processing' ? '处理中' : item.status === 'resolved' ? '已解决' : '已驳回'}
                            </Tag>
                          </Space>
                        }
                        description={
                          <div>
                            <div>{item.description}</div>
                            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                              上报人：{item.reporterName} · {formatDateTime(item.createdAt)}
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                  暂无异常记录
                </div>
              )}
            </Card>
          </Col>

          <Col span={8}>
            <Card title="关联信息" className="card-shadow" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div>
                  <span style={{ color: '#999' }}>加工订单：</span>
                  {workOrder?.processingOrder ? (
                    <a onClick={() => navigate(`/orders/processing/${workOrder.processingOrderId}`)}>
                      {workOrder.processingOrder.orderNo}
                    </a>
                  ) : (
                    <span>{workOrder?.processingOrderNo || '-'}</span>
                  )}
                </div>
                <div>
                  <span style={{ color: '#999' }}>图纸数量：</span>
                  <span>{workOrder?.drawingIds?.length || 0} 张</span>
                </div>
              </Space>
            </Card>

            <Card title="操作" className="card-shadow">
              <Space direction="vertical" style={{ width: '100%' }}>
                {isFactory && workOrder?.status === 'pending' && (
                  <Button
                    type="primary"
                    block
                    icon={<PlayCircleOutlined />}
                    onClick={handleStart}
                  >
                    开始工单
                  </Button>
                )}
                {isFactory && workOrder?.status === 'in_progress' && (
                  <Button
                    type="primary"
                    block
                    icon={<CheckCircleOutlined />}
                    onClick={() => setCompleteVisible(true)}
                  >
                    完成工单
                  </Button>
                )}
                {isFactory && workOrder?.status === 'in_progress' && (
                  <Button
                    block
                    danger
                    icon={<WarningOutlined />}
                    onClick={() => setExceptionVisible(true)}
                  >
                    上报异常
                  </Button>
                )}
                <Button
                  block
                  icon={<FileTextOutlined />}
                  onClick={() => navigate('/workorder/exceptions')}
                >
                  查看所有异常
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>

      <Modal
        title="完成工单"
        open={completeVisible}
        onCancel={() => setCompleteVisible(false)}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Form form={completeForm} layout="vertical" onFinish={handleComplete}>
          <Form.Item
            name="outputQuantity"
            label="产出数量"
            rules={[{ required: true, message: '请输入产出数量' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入产出数量" />
          </Form.Item>
          <Form.Item
            name="defectQuantity"
            label="不良数量"
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入不良数量" />
          </Form.Item>
          <Form.Item
            name="remark"
            label="备注"
          >
            <Input.TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">确认完成</Button>
              <Button onClick={() => setCompleteVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="上报异常"
        open={exceptionVisible}
        onCancel={() => setExceptionVisible(false)}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleReportException}>
          <Form.Item
            name="type"
            label="异常类型"
            rules={[{ required: true, message: '请选择异常类型' }]}
          >
            <Select placeholder="请选择异常类型">
              <Option value="process">工艺异常</Option>
              <Option value="material">材料异常</Option>
              <Option value="equipment">设备异常</Option>
              <Option value="other">其他异常</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="severity"
            label="严重程度"
            rules={[{ required: true, message: '请选择严重程度' }]}
          >
            <Select placeholder="请选择严重程度">
              <Option value="low">低</Option>
              <Option value="medium">中</Option>
              <Option value="high">高</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="description"
            label="异常描述"
            rules={[{ required: true, message: '请描述异常情况' }]}
          >
            <Input.TextArea rows={4} placeholder="请详细描述异常情况" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" danger>提交上报</Button>
              <Button onClick={() => setExceptionVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WorkOrderDetail;
