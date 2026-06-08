import { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Space, message, Row, Col } from 'antd';
import { ArrowLeftOutlined, TruckOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { orderApi } from '../../services/api';
import { formatMoney, formatDate, formatDateTime, orderStatusMap, logisticsStatusMap } from '../../utils/format';
import { MaterialOrder } from '../../types';

const MaterialOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<MaterialOrder | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const data = await orderApi.getMaterialOrder(id!);
      setOrder(data);
    } catch (e) {
      console.error(e);
      message.error('加载订单详情失败');
    } finally {
      setLoading(false);
    }
  };

  if (!order && !loading) {
    return <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>;
  }

  const statusInfo = orderStatusMap[order?.status as keyof typeof orderStatusMap] || { text: order?.status, color: 'default' };
  const logisticsInfo = order?.logistics ? logisticsStatusMap[order.logistics.status] : null;

  return (
    <div>
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
          <h2 className="page-title">原料订单详情</h2>
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
                <Descriptions.Item label="物料名称">{order?.materialName}</Descriptions.Item>
                <Descriptions.Item label="物料编号">{order?.materialCode}</Descriptions.Item>
                <Descriptions.Item label="规格型号" span={2}>{order?.specification}</Descriptions.Item>
                <Descriptions.Item label="需求方">{order?.demanderName}</Descriptions.Item>
                <Descriptions.Item label="供应商">{order?.supplierName}</Descriptions.Item>
                <Descriptions.Item label="数量">{order?.quantity} {order?.unit}</Descriptions.Item>
                <Descriptions.Item label="单价">{formatMoney(order?.unitPrice || 0)}</Descriptions.Item>
                <Descriptions.Item label="总金额">
                  <span style={{ color: '#f5222d', fontWeight: 'bold' }}>{formatMoney(order?.totalAmount || 0)}</span>
                </Descriptions.Item>
                <Descriptions.Item label="交货日期">{formatDate(order?.deliveryDate)}</Descriptions.Item>
                <Descriptions.Item label="质量标准" span={2}>{order?.qualityStandard || '-'}</Descriptions.Item>
                <Descriptions.Item label="关联加工单" span={2}>
                  {order?.processingOrderId ? (
                    <a onClick={() => navigate(`/orders/processing/${order?.processingOrderId}`)}>
                      查看关联加工单
                    </a>
                  ) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="备注" span={2}>{order?.remarks || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{formatDateTime(order?.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{formatDateTime(order?.updatedAt)}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col span={8}>
            {order?.logistics && (
              <Card 
                title="物流信息" 
                className="card-shadow"
                extra={<Tag color={logisticsInfo?.color}>{logisticsInfo?.text}</Tag>}
                style={{ marginBottom: 16 }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <div>
                    <span style={{ color: '#999' }}>物流单号：</span>
                    <span>{order.logistics.trackingNo}</span>
                  </div>
                  <div>
                    <span style={{ color: '#999' }}>承运商：</span>
                    <span>{order.logistics.carrier}</span>
                  </div>
                  <div>
                    <span style={{ color: '#999' }}>发货地：</span>
                    <span>{order.logistics.origin}</span>
                  </div>
                  <div>
                    <span style={{ color: '#999' }}>收货地：</span>
                    <span>{order.logistics.destination}</span>
                  </div>
                  <div>
                    <span style={{ color: '#999' }}>预计送达：</span>
                    <span>{formatDate(order.logistics.estimatedDelivery)}</span>
                  </div>
                  {order.logistics.actualDelivery && (
                    <div>
                      <span style={{ color: '#999' }}>实际送达：</span>
                      <span>{formatDate(order.logistics.actualDelivery)}</span>
                    </div>
                  )}
                  <Button 
                    type="link" 
                    icon={<TruckOutlined />}
                    onClick={() => navigate(`/logistics/${order.logistics?.id}`)}
                    style={{ padding: 0 }}
                  >
                    查看物流详情
                  </Button>
                </Space>
              </Card>
            )}

            <Card title="操作记录" className="card-shadow">
              <div style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>
                暂无操作记录
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default MaterialOrderDetail;
