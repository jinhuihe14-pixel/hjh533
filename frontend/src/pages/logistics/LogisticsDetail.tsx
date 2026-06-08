import { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Space, message, Row, Col, Timeline, Modal, Form, Input, InputNumber, Upload } from 'antd';
import { ArrowLeftOutlined, TruckOutlined, ExclamationCircleOutlined, CameraOutlined, InboxOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { logisticsApi } from '../../services/api';
import { formatMoney, formatDate, formatDateTime, logisticsStatusMap } from '../../utils/format';
import { Logistics, LogisticsTrackingItem } from '../../types';
import { useAuthContext } from '../../App';

const { Dragger } = Upload;

const LogisticsDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [logistics, setLogistics] = useState<Logistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [damageVisible, setDamageVisible] = useState(false);
  const [resolveVisible, setResolveVisible] = useState(false);
  const [form] = Form.useForm();
  const [resolveForm] = Form.useForm();

  useEffect(() => {
    if (id) {
      loadLogistics();
    }
  }, [id]);

  const loadLogistics = async () => {
    setLoading(true);
    try {
      const data = await logisticsApi.getLogistics(id!);
      setLogistics(data);
    } catch (e) {
      console.error(e);
      message.error('加载物流详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDamageReport = async (values: any) => {
    try {
      await logisticsApi.submitDamageReport(id!, {
        damageDescription: values.damageDescription,
        damageQuantity: values.damageQuantity,
        estimatedLoss: values.estimatedLoss
      });
      message.success('破损报告提交成功');
      setDamageVisible(false);
      form.resetFields();
      loadLogistics();
    } catch (e: any) {
      message.error(e.message || '提交失败');
    }
  };

  const handleResolve = async (values: any) => {
    try {
      await logisticsApi.resolveDamage(id!, {
        claimAmount: values.claimAmount,
        resolution: values.resolution
      });
      message.success('理赔处理完成');
      setResolveVisible(false);
      resolveForm.resetFields();
      loadLogistics();
    } catch (e: any) {
      message.error(e.message || '处理失败');
    }
  };

  const getTimelineColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'gray',
      picked_up: 'blue',
      in_transit: 'cyan',
      delivered: 'gold',
      signed: 'green',
      rejected: 'red',
      damaged: 'red'
    };
    return colorMap[status] || 'gray';
  };

  if (!logistics && !loading) {
    return <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>;
  }

  const statusInfo = logisticsStatusMap[logistics?.status as keyof typeof logisticsStatusMap] || { text: logistics?.status, color: 'default' };

  return (
    <div>
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
          <h2 className="page-title">物流详情</h2>
          <Tag color={statusInfo.color} icon={<TruckOutlined />}>{statusInfo.text}</Tag>
        </Space>
      </div>

      <div className="page-content">
        <Row gutter={16}>
          <Col span={16}>
            <Card title="物流信息" className="card-shadow" style={{ marginBottom: 16 }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="物流单号">{logistics?.trackingNo}</Descriptions.Item>
                <Descriptions.Item label="承运商">{logistics?.carrier}</Descriptions.Item>
                <Descriptions.Item label="发货方">{logistics?.senderName}</Descriptions.Item>
                <Descriptions.Item label="收货方">{logistics?.receiverName}</Descriptions.Item>
                <Descriptions.Item label="发货地" span={2}>{logistics?.origin}</Descriptions.Item>
                <Descriptions.Item label="收货地" span={2}>{logistics?.destination}</Descriptions.Item>
                <Descriptions.Item label="当前位置">{logistics?.currentLocation || '-'}</Descriptions.Item>
                <Descriptions.Item label="件数">{logistics?.packageCount} 件</Descriptions.Item>
                {logistics?.weight && <Descriptions.Item label="重量">{logistics.weight} kg</Descriptions.Item>}
                {logistics?.volume && <Descriptions.Item label="体积">{logistics.volume} m³</Descriptions.Item>}
                <Descriptions.Item label="预计送达">{formatDate(logistics?.estimatedDelivery)}</Descriptions.Item>
                <Descriptions.Item label="实际送达">{logistics?.actualDelivery ? formatDate(logistics.actualDelivery) : '-'}</Descriptions.Item>
                <Descriptions.Item label="关联订单" span={2}>
                  {logistics?.orderId && (
                    <a onClick={() => navigate(logistics?.orderType === 'processing' ? `/orders/processing/${logistics.orderId}` : `/orders/material/${logistics.orderId}`)}>
                      查看关联订单
                    </a>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card 
              title="运输轨迹" 
              className="card-shadow"
              extra={user?.role === 'supplier' && logistics?.status !== 'signed' && logistics?.status !== 'delivered' ? (
                <Button type="link" onClick={() => {}}>
                  更新轨迹
                </Button>
              ) : null}
            >
              <Timeline
                mode="left"
                items={[...(logistics?.trackingHistory || [])].reverse().map((item: LogisticsTrackingItem) => ({
                  color: getTimelineColor(item.status),
                  label: formatDateTime(item.time),
                  children: (
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{item.description}</div>
                      <div style={{ color: '#999', fontSize: 12 }}>
                        {item.location}
                        {item.operator && ` · ${item.operator}`}
                      </div>
                    </div>
                  )
                }))}
              />
            </Card>
          </Col>

          <Col span={8}>
            {logistics?.damageReport && (
              <Card 
                title="破损报告" 
                className="card-shadow"
                style={{ marginBottom: 16, borderColor: '#ff4d4f' }}
                extra={
                  <Tag color="red" icon={<ExclamationCircleOutlined />}>
                    {logistics.damageReport.status === 'pending' ? '待处理' : 
                     logistics.damageReport.status === 'processing' ? '处理中' :
                     logistics.damageReport.status === 'resolved' ? '已解决' : '已驳回'}
                  </Tag>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <div>
                    <span style={{ color: '#999' }}>报告时间：</span>
                    <span>{formatDateTime(logistics.damageReport.reportedAt)}</span>
                  </div>
                  <div>
                    <span style={{ color: '#999' }}>报告人：</span>
                    <span>{logistics.damageReport.reportedBy}</span>
                  </div>
                  <div>
                    <span style={{ color: '#999' }}>破损描述：</span>
                    <span>{logistics.damageReport.damageDescription}</span>
                  </div>
                  <div>
                    <span style={{ color: '#999' }}>破损数量：</span>
                    <span>{logistics.damageReport.damageQuantity} 件</span>
                  </div>
                  <div>
                    <span style={{ color: '#999' }}>预估损失：</span>
                    <span style={{ color: '#f5222d' }}>{formatMoney(logistics.damageReport.estimatedLoss)}</span>
                  </div>
                  {logistics.damageReport.claimAmount !== undefined && (
                    <div>
                      <span style={{ color: '#999' }}>理赔金额：</span>
                      <span style={{ color: '#52c41a' }}>{formatMoney(logistics.damageReport.claimAmount)}</span>
                    </div>
                  )}
                  {logistics.damageReport.resolution && (
                    <div>
                      <span style={{ color: '#999' }}>处理结果：</span>
                      <span>{logistics.damageReport.resolution}</span>
                    </div>
                  )}
                </Space>
                {(user?.role === 'demander' || user?.role === 'admin') && logistics.damageReport.status === 'pending' && (
                  <Button 
                    type="primary" 
                    block 
                    style={{ marginTop: 16 }}
                    onClick={() => setResolveVisible(true)}
                  >
                    处理理赔
                  </Button>
                )}
              </Card>
            )}

            <Card title="操作" className="card-shadow">
              <Space direction="vertical" style={{ width: '100%' }}>
                {(user?.role === 'demander' || user?.role === 'factory') && 
                 logistics?.status === 'delivered' && 
                 !logistics?.damageReport && (
                  <Button 
                    type="primary" 
                    block 
                    danger
                    icon={<ExclamationCircleOutlined />}
                    onClick={() => setDamageVisible(true)}
                  >
                    报告破损
                  </Button>
                )}
                <Button block icon={<CameraOutlined />}>
                  查看签收凭证
                </Button>
                <Button block icon={<TruckOutlined />}>
                  联系承运商
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>

      <Modal
        title="报告破损"
        open={damageVisible}
        onCancel={() => setDamageVisible(false)}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleDamageReport}>
          <Form.Item
            name="damageDescription"
            label="破损描述"
            rules={[{ required: true, message: '请描述破损情况' }]}
          >
            <Input.TextArea rows={3} placeholder="请详细描述破损情况" />
          </Form.Item>
          <Form.Item
            name="damageQuantity"
            label="破损数量"
            rules={[{ required: true, message: '请输入破损数量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入破损数量" />
          </Form.Item>
          <Form.Item
            name="estimatedLoss"
            label="预估损失金额"
            rules={[{ required: true, message: '请输入预估损失金额' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入预估损失金额" prefix="¥" />
          </Form.Item>
          <Form.Item
            name="photos"
            label="破损照片"
          >
            <Dragger
              listType="picture-card"
              beforeUpload={() => false}
              multiple
            >
              <div>
                <CameraOutlined style={{ fontSize: 24 }} />
                <div style={{ marginTop: 8 }}>上传照片</div>
              </div>
            </Dragger>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" danger>提交报告</Button>
              <Button onClick={() => setDamageVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="处理理赔"
        open={resolveVisible}
        onCancel={() => setResolveVisible(false)}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Form form={resolveForm} layout="vertical" onFinish={handleResolve}>
          <Form.Item
            name="claimAmount"
            label="理赔金额"
            rules={[{ required: true, message: '请输入理赔金额' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入理赔金额" prefix="¥" />
          </Form.Item>
          <Form.Item
            name="resolution"
            label="处理说明"
            rules={[{ required: true, message: '请输入处理说明' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入处理说明" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">确认处理</Button>
              <Button onClick={() => setResolveVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LogisticsDetail;
