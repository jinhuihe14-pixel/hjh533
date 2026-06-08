import { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Space, message, Row, Col, Table, Progress, Modal, Form, InputNumber } from 'antd';
import { ArrowLeftOutlined, FileTextOutlined, PayCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { paymentApi } from '../../services/api';
import { formatMoney, formatDate, formatDateTime, paymentStatusMap, paymentTypeMap, invoiceStatusMap } from '../../utils/format';
import { Payment } from '../../types';

const PaymentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [payVisible, setPayVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (id) {
      loadPayment();
    }
  }, [id]);

  const loadPayment = async () => {
    setLoading(true);
    try {
      const data = await paymentApi.getPayment(id!);
      setPayment(data);
    } catch (e) {
      console.error(e);
      message.error('加载账款详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (values: any) => {
    try {
      await paymentApi.pay(id!, values.amount);
      message.success('付款成功');
      setPayVisible(false);
      form.resetFields();
      loadPayment();
    } catch (e: any) {
      message.error(e.message || '付款失败');
    }
  };

  const openPayModal = () => {
    form.setFieldsValue({ amount: (payment?.amount || 0) - (payment?.paidAmount || 0) });
    setPayVisible(true);
  };

  const invoiceColumns = [
    {
      title: '发票编号',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo'
    },
    {
      title: '发票类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          vat_special: '增值税专用发票',
          vat_normal: '增值税普通发票',
          electronic: '电子发票'
        };
        return typeMap[type] || type;
      }
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => formatMoney(val)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = invoiceStatusMap[status as keyof typeof invoiceStatusMap] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '开票日期',
      dataIndex: 'issuedDate',
      key: 'issuedDate',
      render: (val: string) => formatDate(val)
    }
  ];

  if (!payment && !loading) {
    return <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>;
  }

  const statusInfo = paymentStatusMap[payment?.status as keyof typeof paymentStatusMap] || { text: payment?.status, color: 'default' };
  const typeInfo = paymentTypeMap[payment?.type || ''] || { text: payment?.type, color: 'default' };
  const paidPercent = payment ? Math.round((payment.paidAmount / payment.amount) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
          <h2 className="page-title">账款详情</h2>
          <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
          <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
        </Space>
      </div>

      <div className="page-content">
        <Row gutter={16}>
          <Col span={16}>
            <Card title="账款信息" className="card-shadow" style={{ marginBottom: 16 }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="账款编号">{payment?.paymentNo}</Descriptions.Item>
                <Descriptions.Item label="账款状态">
                  <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="付款方">{payment?.payerName}</Descriptions.Item>
                <Descriptions.Item label="收款方">{payment?.payeeName}</Descriptions.Item>
                <Descriptions.Item label="账款金额">
                  <span style={{ color: '#f5222d', fontWeight: 'bold', fontSize: 18 }}>
                    {formatMoney(payment?.amount || 0)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="已付金额">
                  <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                    {formatMoney(payment?.paidAmount || 0)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="账期">{payment?.paymentTerm}</Descriptions.Item>
                <Descriptions.Item label="到期日期">
                  <span style={{ color: payment?.isOverdue ? '#f5222d' : undefined }}>
                    {formatDate(payment?.dueDate)}
                    {payment?.isOverdue && <Tag color="red" style={{ marginLeft: 8 }}>已逾期</Tag>}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="关联订单" span={2}>
                  {payment?.orderId && (
                    <a onClick={() => navigate(payment?.orderType === 'processing' ? `/orders/processing/${payment.orderId}` : `/orders/material/${payment.orderId}`)}>
                      查看关联订单
                    </a>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">{formatDateTime(payment?.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{formatDateTime(payment?.updatedAt)}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card 
              title="关联发票" 
              className="card-shadow"
              extra={<Button type="link" icon={<FileTextOutlined />}>开具发票</Button>}
            >
              <Table
                columns={invoiceColumns}
                dataSource={payment?.invoices || []}
                rowKey="id"
                pagination={false}
                size="small"
              />
              {(payment?.invoices?.length || 0) === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                  暂无发票记录
                </div>
              )}
            </Card>
          </Col>

          <Col span={8}>
            <Card 
              title="付款进度" 
              className="card-shadow"
              style={{ marginBottom: 16 }}
            >
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <Progress 
                  type="dashboard" 
                  percent={paidPercent} 
                  format={() => `${paidPercent}%`}
                  strokeColor={paidPercent === 100 ? '#52c41a' : '#1890ff'}
                />
                <div style={{ marginTop: 10 }}>
                  已付 {formatMoney(payment?.paidAmount || 0)} / {formatMoney(payment?.amount || 0)}
                </div>
              </div>
              {(payment?.type === 'payable' || payment?.type === 'prepaid_paid') && payment?.status !== 'paid' && (
                <Button 
                  type="primary" 
                  block 
                  icon={<PayCircleOutlined />}
                  onClick={openPayModal}
                  style={{ marginTop: 16 }}
                >
                  立即付款
                </Button>
              )}
            </Card>

            <Card title="账期信息" className="card-shadow">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div>
                  <span style={{ color: '#999' }}>账期类型：</span>
                  <span>{payment?.paymentTerm}</span>
                </div>
                <div>
                  <span style={{ color: '#999' }}>到期日期：</span>
                  <span style={{ color: payment?.isOverdue ? '#f5222d' : undefined }}>
                    {formatDate(payment?.dueDate)}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#999' }}>逾期状态：</span>
                  <Tag color={payment?.isOverdue ? 'red' : 'green'}>
                    {payment?.isOverdue ? '已逾期' : '正常'}
                  </Tag>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>

      <Modal
        title="付款"
        open={payVisible}
        onCancel={() => setPayVisible(false)}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handlePay}>
          <Form.Item
            name="amount"
            label="付款金额"
            rules={[{ required: true, message: '请输入付款金额' }]}
          >
            <InputNumber 
              min={0} 
              max={payment ? payment.amount - payment.paidAmount : undefined}
              style={{ width: '100%' }} 
              placeholder="请输入付款金额" 
              prefix="¥"
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">确认付款</Button>
              <Button onClick={() => setPayVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PaymentDetail;
