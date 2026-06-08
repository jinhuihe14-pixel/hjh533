import { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Space, message, Row, Col } from 'antd';
import { ArrowLeftOutlined, FileTextOutlined, CheckCircleOutlined, InboxOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { invoiceApi } from '../../services/api';
import { formatMoney, formatDate, formatDateTime, invoiceStatusMap, invoiceTypeMap } from '../../utils/format';
import { Invoice } from '../../types';

const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadInvoice();
    }
  }, [id]);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      const data = await invoiceApi.getInvoice(id!);
      setInvoice(data);
    } catch (e) {
      console.error(e);
      message.error('加载发票详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      await invoiceApi.verifyInvoice(id!);
      message.success('发票验真成功');
      loadInvoice();
    } catch (e: any) {
      message.error(e.message || '验真失败');
    }
  };

  const handleArchive = async () => {
    try {
      await invoiceApi.archiveInvoice(id!);
      message.success('发票归档成功');
      loadInvoice();
    } catch (e: any) {
      message.error(e.message || '归档失败');
    }
  };

  if (!invoice && !loading) {
    return <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>;
  }

  const statusInfo = invoiceStatusMap[invoice?.status as keyof typeof invoiceStatusMap] || { text: invoice?.status, color: 'default' };

  return (
    <div>
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
          <h2 className="page-title">发票详情</h2>
          <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
        </Space>
      </div>

      <div className="page-content">
        <Row gutter={16}>
          <Col span={16}>
            <Card title="发票信息" className="card-shadow" style={{ marginBottom: 16 }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="发票号码">{invoice?.invoiceNo}</Descriptions.Item>
                <Descriptions.Item label="发票代码">{invoice?.invoiceCode || '-'}</Descriptions.Item>
                <Descriptions.Item label="发票类型">{invoiceTypeMap[invoice?.type || ''] || invoice?.type}</Descriptions.Item>
                <Descriptions.Item label="发票状态">
                  <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="开票方">{invoice?.payeeName}</Descriptions.Item>
                <Descriptions.Item label="受票方">{invoice?.payerName}</Descriptions.Item>
                <Descriptions.Item label="金额（不含税）">{formatMoney(invoice?.amount || 0)}</Descriptions.Item>
                <Descriptions.Item label="税额">{formatMoney(invoice?.taxAmount || 0)}</Descriptions.Item>
                <Descriptions.Item label="价税合计">
                  <span style={{ color: '#f5222d', fontWeight: 'bold', fontSize: 16 }}>
                    {formatMoney(invoice?.totalAmount || 0)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="开票日期">{formatDate(invoice?.issuedDate)}</Descriptions.Item>
                {invoice?.verifiedDate && (
                  <Descriptions.Item label="验真日期">{formatDate(invoice.verifiedDate)}</Descriptions.Item>
                )}
                {invoice?.archiveDate && (
                  <Descriptions.Item label="归档日期">{formatDate(invoice.archiveDate)}</Descriptions.Item>
                )}
                <Descriptions.Item label="创建时间">{formatDateTime(invoice?.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{formatDateTime(invoice?.updatedAt)}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="关联订单" className="card-shadow">
              {(invoice?.orderIds?.length || 0) > 0 ? (
                <div>
                  {invoice?.orderIds?.map((orderId, index) => (
                    <div key={index} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <a onClick={() => navigate(`/orders/processing/${orderId}`)}>
                        {orderId}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                  暂无关联订单
                </div>
              )}
            </Card>
          </Col>

          <Col span={8}>
            <Card title="发票附件" className="card-shadow" style={{ marginBottom: 16 }}>
              {invoice?.attachmentId ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <FileTextOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                  <div style={{ marginTop: 10 }}>发票文件.pdf</div>
                  <Button type="link" icon={<FileTextOutlined />}>
                    查看附件
                  </Button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                  暂无附件
                </div>
              )}
            </Card>

            <Card title="操作" className="card-shadow">
              <Space direction="vertical" style={{ width: '100%' }}>
                {invoice?.status === 'issued' && (
                  <Button 
                    type="primary" 
                    block 
                    icon={<CheckCircleOutlined />}
                    onClick={handleVerify}
                  >
                    发票验真
                  </Button>
                )}
                {(invoice?.status === 'issued' || invoice?.status === 'verified') && (
                  <Button 
                    block 
                    icon={<InboxOutlined />}
                    onClick={handleArchive}
                  >
                    归档发票
                  </Button>
                )}
                <Button block icon={<FileTextOutlined />}>
                  下载发票
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default InvoiceDetail;
