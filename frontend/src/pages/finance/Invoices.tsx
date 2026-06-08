import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, Modal, Form, DatePicker, InputNumber, message, Upload } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, FileTextOutlined, CheckCircleOutlined, InboxOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { invoiceApi } from '../../services/api';
import { formatMoney, formatDate, invoiceStatusMap, invoiceTypeMap } from '../../utils/format';
import { Invoice } from '../../types';
import { useAuthContext } from '../../App';

const { Option } = Select;
const { Dragger } = Upload;

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  useEffect(() => {
    loadInvoices();
  }, [page, pageSize, status, type, keyword]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (status) params.status = status;
      if (type) params.type = type;
      if (keyword) params.keyword = keyword;
      
      const data = await invoiceApi.getInvoices(params);
      setInvoices(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
      message.error('加载发票列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      const data = {
        ...values,
        issuedDate: values.issuedDate?.toISOString(),
        amount: Number(values.amount),
        taxAmount: Number(values.taxAmount)
      };
      await invoiceApi.createInvoice(data);
      message.success('发票创建成功');
      setModalVisible(false);
      form.resetFields();
      loadInvoices();
    } catch (e: any) {
      message.error(e.message || '创建失败');
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await invoiceApi.verifyInvoice(id);
      message.success('发票验真成功');
      loadInvoices();
    } catch (e: any) {
      message.error(e.message || '验真失败');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await invoiceApi.archiveInvoice(id);
      message.success('发票归档成功');
      loadInvoices();
    } catch (e: any) {
      message.error(e.message || '归档失败');
    }
  };

  const columns = [
    {
      title: '发票编号',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
      render: (text: string, record: Invoice) => (
        <a onClick={() => navigate(`/finance/invoices/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '发票代码',
      dataIndex: 'invoiceCode',
      key: 'invoiceCode'
    },
    {
      title: '发票类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => invoiceTypeMap[type] || type
    },
    {
      title: user?.role === 'demander' || user?.role === 'factory' ? '开票方' : '受票方',
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
      title: '税额',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      render: (val: number) => formatMoney(val || 0)
    },
    {
      title: '价税合计',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => formatMoney(val)
    },
    {
      title: '开票日期',
      dataIndex: 'issuedDate',
      key: 'issuedDate',
      render: (val: string) => formatDate(val)
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
      title: '操作',
      key: 'action',
      render: (_: any, record: Invoice) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/finance/invoices/${record.id}`)}>
            详情
          </Button>
          {record.status === 'issued' && (
            <Button type="link" icon={<CheckCircleOutlined />} onClick={() => handleVerify(record.id)}>
              验真
            </Button>
          )}
          {(record.status === 'issued' || record.status === 'verified') && (
            <Button type="link" icon={<InboxOutlined />} onClick={() => handleArchive(record.id)}>
              归档
            </Button>
          )}
        </Space>
      )
    }
  ];

  const typeOptions = [
    { value: '', label: '全部类型' },
    { value: 'vat_special', label: '增值税专用发票' },
    { value: 'vat_normal', label: '增值税普通发票' },
    { value: 'electronic', label: '电子发票' }
  ];

  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'pending', label: '待开具' },
    { value: 'issued', label: '已开具' },
    { value: 'verified', label: '已验真' },
    { value: 'archived', label: '已归档' }
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="page-title">票据管理</h2>
          {user?.role === 'supplier' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
              开具发票
            </Button>
          )}
        </div>
      </div>

      <div className="page-content">
        <Card className="card-shadow">
          <Space style={{ marginBottom: 16 }} size="large">
            <Input
              placeholder="搜索发票编号/代码"
              prefix={<SearchOutlined />}
              style={{ width: 240 }}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              allowClear
            />
            <Select
              placeholder="发票类型"
              style={{ width: 160 }}
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
            <Button icon={<ReloadOutlined />} onClick={loadInvoices}>刷新</Button>
          </Space>

          <Table
            columns={columns}
            dataSource={invoices}
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
        title="开具发票"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ flex: '1 1 48%' }}>
              <Form.Item
                name="invoiceNo"
                label="发票号码"
                rules={[{ required: true, message: '请输入发票号码' }]}
              >
                <Input placeholder="请输入发票号码" />
              </Form.Item>
            </div>
            <div style={{ flex: '1 1 48%' }}>
              <Form.Item
                name="invoiceCode"
                label="发票代码"
              >
                <Input placeholder="请输入发票代码" />
              </Form.Item>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ flex: '1 1 48%' }}>
              <Form.Item
                name="type"
                label="发票类型"
                rules={[{ required: true, message: '请选择发票类型' }]}
                initialValue="electronic"
              >
                <Select placeholder="请选择发票类型">
                  <Option value="vat_special">增值税专用发票</Option>
                  <Option value="vat_normal">增值税普通发票</Option>
                  <Option value="electronic">电子发票</Option>
                </Select>
              </Form.Item>
            </div>
            <div style={{ flex: '1 1 48%' }}>
              <Form.Item
                name="issuedDate"
                label="开票日期"
                rules={[{ required: true, message: '请选择开票日期' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="请选择开票日期" />
              </Form.Item>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ flex: '1 1 48%' }}>
              <Form.Item
                name="amount"
                label="金额（不含税）"
                rules={[{ required: true, message: '请输入金额' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入金额" prefix="¥" />
              </Form.Item>
            </div>
            <div style={{ flex: '1 1 48%' }}>
              <Form.Item
                name="taxAmount"
                label="税额"
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入税额" prefix="¥" />
              </Form.Item>
            </div>
          </div>
          <Form.Item
            name="payerId"
            label="受票方"
            rules={[{ required: true, message: '请选择受票方' }]}
          >
            <Select placeholder="请选择受票方">
              {/* 这里应该从API获取客户列表 */}
            </Select>
          </Form.Item>
          <Form.Item
            name="attachment"
            label="发票附件"
          >
            <Dragger
              beforeUpload={() => false}
              maxCount={1}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
              <p className="ant-upload-hint">支持PDF、图片格式</p>
            </Dragger>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">提交</Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Invoices;
