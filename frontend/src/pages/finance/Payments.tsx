import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, Modal, Form, InputNumber, message, Statistic, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined, PayCircleOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { paymentApi } from '../../services/api';
import { formatMoney, formatDate, paymentStatusMap, paymentTypeMap } from '../../utils/format';
import { Payment } from '../../types';
import { useAuthContext } from '../../App';

const { Option } = Select;

const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [payVisible, setPayVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [summary, setSummary] = useState<any>({});
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  useEffect(() => {
    loadPayments();
    loadSummary();
  }, [page, pageSize, status, type, keyword]);

  const loadSummary = async () => {
    try {
      const data = await paymentApi.getSummary();
      setSummary(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (status) params.status = status;
      if (type) params.type = type;
      if (keyword) params.keyword = keyword;
      
      const data = await paymentApi.getPayments(params);
      setPayments(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
      message.error('加载账款列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (values: any) => {
    try {
      await paymentApi.pay(selectedPayment!.id, values.amount);
      message.success('付款成功');
      setPayVisible(false);
      form.resetFields();
      loadPayments();
      loadSummary();
    } catch (e: any) {
      message.error(e.message || '付款失败');
    }
  };

  const openPayModal = (record: Payment) => {
    setSelectedPayment(record);
    form.setFieldsValue({ amount: record.amount - record.paidAmount });
    setPayVisible(true);
  };

  const columns = [
    {
      title: '账款编号',
      dataIndex: 'paymentNo',
      key: 'paymentNo',
      render: (text: string, record: Payment) => (
        <a onClick={() => navigate(`/finance/payments/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '账款类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const info = paymentTypeMap[type] || { text: type, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: user?.role === 'demander' || user?.role === 'factory' ? '收款方' : '付款方',
      dataIndex: user?.role === 'demander' || user?.role === 'factory' ? 'payeeName' : 'payerName',
      key: 'partner'
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => formatMoney(val)
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      render: (val: number) => formatMoney(val)
    },
    {
      title: '账期',
      dataIndex: 'paymentTerm',
      key: 'paymentTerm'
    },
    {
      title: '到期日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (val: string, record: Payment) => (
        <span style={{ color: record.isOverdue ? '#f5222d' : undefined }}>
          {formatDate(val)}
          {record.isOverdue && <Tag color="red" style={{ marginLeft: 8 }}>已逾期</Tag>}
        </span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = paymentStatusMap[status as keyof typeof paymentStatusMap] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Payment) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/finance/payments/${record.id}`)}>
            详情
          </Button>
          {(record.type === 'payable' || record.type === 'prepaid_paid') && record.status !== 'paid' && (
            <Button type="link" onClick={() => openPayModal(record)}>
              付款
            </Button>
          )}
        </Space>
      )
    }
  ];

  const typeOptions = [
    { value: '', label: '全部类型' },
    { value: 'receivable', label: '应收账款' },
    { value: 'payable', label: '应付账款' },
    { value: 'prepaid_received', label: '预收账款' },
    { value: 'prepaid_paid', label: '预付账款' }
  ];

  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'unpaid', label: '未付款' },
    { value: 'partial', label: '部分付款' },
    { value: 'paid', label: '已付款' },
    { value: 'overdue', label: '已逾期' }
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">账款管理</h2>
      </div>

      <div className="page-content">
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card className="card-shadow">
              <Statistic 
                title="应收账款" 
                value={summary.receivable || 0} 
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="card-shadow">
              <Statistic 
                title="应付账款" 
                value={summary.payable || 0} 
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="card-shadow">
              <Statistic 
                title="已逾期" 
                value={summary.overdue || 0} 
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="card-shadow">
              <Statistic 
                title="本月到期" 
                value={summary.dueThisMonth || 0} 
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        <Card className="card-shadow">
          <Space style={{ marginBottom: 16 }} size="large">
            <Input
              placeholder="搜索账款编号"
              prefix={<SearchOutlined />}
              style={{ width: 240 }}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              allowClear
            />
            <Select
              placeholder="账款类型"
              style={{ width: 140 }}
              value={type || undefined}
              onChange={val => setType(val || '')}
              allowClear
            >
              {typeOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
            <Select
              placeholder="状态"
              style={{ width: 140 }}
              value={status || undefined}
              onChange={val => setStatus(val || '')}
              allowClear
            >
              {statusOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadPayments}>刷新</Button>
          </Space>

          <Table
            columns={columns}
            dataSource={payments}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              }
            }}
          />
        </Card>
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
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <div>账款编号：{selectedPayment?.paymentNo}</div>
            <div>应付金额：{formatMoney(selectedPayment?.amount || 0)}</div>
            <div>已付金额：{formatMoney(selectedPayment?.paidAmount || 0)}</div>
            <div style={{ color: '#f5222d', fontWeight: 'bold', marginTop: 8 }}>
              待付金额：{formatMoney((selectedPayment?.amount || 0) - (selectedPayment?.paidAmount || 0))}
            </div>
          </div>
          <Form.Item
            name="amount"
            label="付款金额"
            rules={[{ required: true, message: '请输入付款金额' }]}
          >
            <InputNumber 
              min={0} 
              max={selectedPayment ? selectedPayment.amount - selectedPayment.paidAmount : undefined}
              style={{ width: '100%' }} 
              placeholder="请输入付款金额" 
              prefix="¥"
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<PayCircleOutlined />}>确认付款</Button>
              <Button onClick={() => setPayVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Payments;
